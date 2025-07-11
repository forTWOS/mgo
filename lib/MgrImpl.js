/**
 * Created by Linqy on 2018\6\28 0027.
 */

let logger = require('./Logger');//如无设置，默认
const EventEmitter = require('events').EventEmitter;
const mongodb = require('mongodb'),
    ObjectId = mongodb.ObjectId;

const GMgrImpl = global.MgrImpl = {_mgr: null};//全局：当前为取_mgr

const S_Db = require('./Db');//数据库连接封装
const S_DbCoc = require('./DbCoc');//数据表封装
const S_Data = require('./Data'); // 数据封装
const S_Rule = require('./Rule'); // 规则封装

const G_SaveLimit = 200;

const MgrImpl_stage = {
    'Uninited' : undefined,
    'Inited' : 1,
    'Running' : 2,
    'Error' : 3,
    'Stoped' : 4
};
class MgrImpl extends EventEmitter{
    constructor(opts) {
        super();

        this.__app = null;
        this.__opts = {
            env: 'development',
            IsDebug: true,
            db: {
                host: '127.0.0.1',
                port: 27017,
                databases: []
            },
            _connStr: '',
            _connOpts: {
                //useNewUrlParser: true,
                mongos: false,
                authMechanism: 'SCRAM-SHA-1',
                authSource: 'admin'
            }

        };
        this.__DbConnected = new Set(); // 记录Db是否已连接上
        this.__DbMap = new Map();
        this.__DbCocMap = new Map();
        this.__rDataMap = new Map();
        this.__DataMap = new Map();
        this.__RuleMap = new Map(); // coname: Rule
        this.__inited_dbCocIndexes = new Set();
        this.__SDataMap = new Map(); // 各表Data类,主要实现methods功能
        // this.DataTemplateMap = new Map();// 继承自Data，根据rule规则生成有hook的各表模板
        this.__tickT = undefined;// 定时器句柄
        this.__status = MgrImpl_stage.Uninited;
        this.__nextStatePrint = 0;//下次状态打印时间
        this.__defaultDbName = undefined;// 默认dbName，取配置的第1个
        this.__inited = false;
        this.__delayLoad = new Set();
        this.__inited_dbCocMap = new Set(); // 是否将实例(DbCoc)添加上自定义函数
        this.__tableNameUnique = new Set();
    }
    Init(opts) {
        if (!this._parseArgs(opts)) {
            return;
        }
        this.__app = opts.app;
        this._init();

        this.__status = MgrImpl_stage.Inited;
        this.__inited = true;

        this._afterInit();
    }
    _afterInit() {
        if (this.__delayLoad.size > 0) {
            const mgoLoadTables = this.__app.get('mgoLoadTables');
            const mgoUnLoadTables = this.__app.get('mgoUnLoadTables');
            if (mgoLoadTables && mgoLoadTables != '*') {
                this.__delayLoad.forEach(([dbName, cocName]) => {
                    if (-1 === mgoLoadTables.indexOf(cocName)) {
                        logger.info('[MgrImpl] not allow table[%j] access, tables:%j.', cocName, mgoLoadTables);
                        this.UnLoad([dbName, cocName]);
                    }
                });
            }
            if (mgoUnLoadTables) {
                this.__delayLoad.forEach(([dbName, cocName]) => {
                    if (-1 !== mgoUnLoadTables.indexOf(cocName)) {
                        logger.info('[MgrImpl] not allow table[%j] access, unloadTables:%j.', cocName, mgoUnLoadTables);
                        this.UnLoad([dbName, cocName]);
                    }
                });
            }
        }
    }
    // return DbCoc=>数据操作
    Load([dbName, ruleOpts]) { // 做成无阻塞的接口，在require初始化
		if (!!!dbName) {
			dbName = this.__defaultDbName;
		}
        if (this.__tableNameUnique.has(dbName+'_'+ruleOpts.tableName)) {
            return;
        }
        this.__tableNameUnique.add(dbName+'_'+ruleOpts.tableName);
        const rule = S_Rule(dbName, ruleOpts);//规则化-检测

        let cocName = rule.GetTableName();
        if (!cocName) {
            throw new Error('[MgrImpl.Load] invalid params.');
        }

        if (!this.__inited) {
            this.__delayLoad.add([dbName, cocName]);
        } else {
            const mgoLoadTables = this.__app.get('mgoLoadTables');
            const mgoUnLoadTables = this.__app.get('mgoUnLoadTables');
            if ((mgoLoadTables && mgoLoadTables != '*' && -1 === mgoLoadTables.indexOf(cocName)) || (mgoUnLoadTables && -1 !== mgoUnLoadTables.indexOf(cocName))) {
                logger.info('[MgrImpl] not allow table[%j] access, tables:%j, unloadTables:%j.', cocName, mgoLoadTables, mgoUnLoadTables);
                return;
            }
        }

        let dataKey = MgrImpl.GenDataKey([dbName, cocName]);

        this.__SDataMap.set(dataKey, MgrImpl._dataFactory(rule.GetMethods()));

        this.__DbCocMap.set(dataKey, S_DbCoc([dbName, cocName]));
        this.__rDataMap.set(dataKey, new Map());
        this.__DataMap.set(dataKey, new Map());
        this._loadRule(dataKey, rule);
        this._initDbCocMap();
        this._initIndex();
        return this.__DbCocMap.get(dataKey);
    }

    async _initIndex() {
        logger.debug('[MgrImpl] _initIndex');
        if (this.__status !== MgrImpl_stage.Running) {
            return;
        }
        // 处理索引流程
        for (let [dataKey, rule] of this.__RuleMap) {
            if (this.__inited_dbCocIndexes.has(dataKey) || !this.__DbMap.has(rule.GetDbName())) {
                continue;
            }
            this.__inited_dbCocIndexes.add(dataKey);

            let indexes = rule.GetIndexes();
            if (indexes.size == 0) {
                continue;
            }

            let db = this.__DbMap.get(rule.GetDbName());
            const collections = await db.Db().collections();
            const collectionExists = collections.some(coll => {coll.collectionName === rule.GetTableName()});
            if (!collectionExists) {
                await db.Db().createCollection(rule.GetTableName());
            }
            let coc = db.Coc(rule.GetTableName());
            if (!coc) {
                throw new Error('[MgrImpl._initIndex] db.coc['+rule.GetDbName()+':'+rule.GetTableName()+'] fetch collection err.');
            }
            
            coc.indexInformation({full:true}).then((err, res) => {
                let indexesExist = new Set();
                if (!err) {
                    for (let k in res) {
                        indexesExist.add(k);
                    }
                }
                let createIndexes = [];
                for (let [k, ruleIndexes] of indexes) {
                    if (indexesExist.has(k)) {
                        continue;
                    }
                    if (Array.isArray(ruleIndexes)) {
                        //复合索引
                        let opts = {};
                        for (let i = 0; i < ruleIndexes.length; ++i) {
                            opts[ruleIndexes[i]] = 1;
                        }
                        createIndexes.push({key: opts, name: k});
                    } else if (ruleIndexes.index) {
                        //单一索引
                        let opts = {};
                        opts[k] = ruleIndexes.index;
                        let uniqueValue = !!ruleIndexes.unique;
                        createIndexes.push({key: opts, name: k, unique: uniqueValue});
                    }
                }
                if (createIndexes.length > 0) {
                    coc.createIndexes(createIndexes);
                }
            })
            .catch((err)=>{
                console.error(err);//'NamespaceNotFound'
            })
            .finally(() => {});
        }
    }

    _initDbCocMap() {
        // logger.debug('[MgrImpl] _initDbCocMap');
        for (let [dataKey, coc] of this.__DbCocMap) {
            if (!!this.__inited_dbCocMap.has(dataKey)) {
                continue;
            }
            this.__inited_dbCocMap.add(dataKey);

            let rule = this.GetRule(dataKey);
            for (let [method, fn] of rule.GetGMethods()) {
                // logger.debug('[MgrImpl] _initDbCocMap:%j, %j', dataKey, method);
                coc[method] = fn.bind(coc);
            }
        }
    }

    static GenDataKey([dbName, cocName]) {
        let dataKey = dbName+'/'+cocName;
        Number(dataKey);
        return dataKey;
    }
    UnLoad([dbName, cocName]) {
        logger.info('[MgrImpl] UnLoad db[%j], table[%j] access.', dbName, cocName);
        let dataKey = MgrImpl.GenDataKey([dbName, cocName]);
        this.__SDataMap.delete(dataKey);
        this.__DbCocMap.delete(dataKey);
        this.__rDataMap.delete(dataKey);
        this.__DataMap.delete(dataKey);
        this.__RuleMap.delete(dataKey);
    }

    IsStopped() {
        return this.__status == MgrImpl_stage.Stoped;
    }
    _loadRule(dataKey, rule) {
        if (this.__RuleMap.has(dataKey)) {
            throw new Error('[MgrImpl.loadRule] rule('+dataKey+') duplicated.');
        }

        // const createDataTemplate = function(r) {
        //     return class extends S_Data {
        //         constructor(...args) {
        //             super(...args);
        //         }
        //     }
        // };

        // const tmpClass = class extends S_Data {
        //     constructor(...args) {
        //         super(...args);
        //     }
        // };

        this.__RuleMap.set(dataKey, rule);
        // this.DataTemplateMap[dataKey] = tmpClass;
    }
    GetRule(dataKey) {
        return this.__RuleMap.get(dataKey);
    }

    // 用于映射真实数据
    // DbCoc使用
    GetData(key, id) {
        // logger.trace(id, typeof id);
        // logger.trace(this.__DataMap);
        if (!this.__DataMap.has(key) || !this.__DataMap.get(key).has(id)) {
            logger.debug('[MgrImpl.GetData] err: key('+key+'), id('+id+') empty.');
            return undefined;
        }
        return this.__DataMap.get(key).get(id);
    }
    RemoveData(key, id) {
        if (!this.__DataMap.has(key) || !this.__DataMap.get(key).has(id)) {
            logger.warn('[MgrImpl.RemoveData] err: key('+key+'), id('+id+') not exists.');
            return;
        }
        this.__DataMap.get(key).delete(id);
        this.__rDataMap.get(key).delete(id);
    }
    GetRData(key, id) {
        if (!this.__rDataMap.has(key) || !this.__rDataMap.get(key).has(id)) {
            return undefined;
        }
        return this.__rDataMap.get(key).get(id);
    }
    GetDbCoc(key) {
        return this.__DbCocMap.get(key);
    }
    GetDb(dbName) {
        return this.__DbMap.get(dbName);
    }

    //DbCoc真实数据封装接口
    // data需是对象
    CreateData([dbName, cocName], data) {
        logger.trace('[MgrImpl.CreateData] begin.');
        const dataInstance = this.doCreateData([dbName, cocName, true], data);
        if (!dataInstance) {
            return undefined;
        }
        dataInstance.__isCreated = true;

        return dataInstance;
    }
    doCreateData([dbName, cocName, isCreated], data) {
        let key = dbName + '/' + cocName;
        if (undefined === data._id) {// 本套游戏方案中，需设定_id
            logger.warn('[MgrImpl.doCreateData] key:%j, err: data._id undefined.', key);
            return undefined;
        }
        if (!this.__DataMap.has(key)) {
            logger.error('[MgrImpl.doCreateData] key:%j __DataMap not inited.', key)
            return;
        }

        let id = data._id.toString();
        logger.trace('[MgrImpl.doCreateData] id:',id, typeof data._id);
        if (this.__DataMap.get(key).has(id)) {
            logger.warn('[MgrImpl.doCreateData] err: data._id('+id+') duplicate.');
            return this.__DataMap.get(key).get(id);
        }

        const rules = this.__RuleMap.get(key).GetRules();

        let idData = {};
        this.__rDataMap.get(key).set(id, idData);
        // logger.trace("__rDataMap size:", this.__rDataMap.get(key).size);
        let SubData = this.__SDataMap.get(key);
        let dataInstance = new SubData([dbName, cocName], id, data._id);
        this.__DataMap.get(key).set(id, dataInstance);

        // console.log(data);
        // 第一种使用hook函数，cpu无波动
        for (let [k, rule] of rules) {
            // console.log(k);//name
            Object.defineProperty(dataInstance, k, {//todo 优化写法
                get: function() {
                    let rdata = GMgrImpl._mgr.__rDataMap.get(key).get(id);
                    // console.log(rdata);
                    logger.trace('[Data.getter] ' + k);
                    if (undefined === rdata[k]) {
                        if (rule.type == 'object') {
                            rdata[k] = {};
                        } else if (rule.type == 'array') {
                            rdata[k] = [];
                        } else if (rule.default instanceof Function) {
                            if (rule.default === Date) {
                                rdata[k] = new rule.default();
                            } else {
                                rdata[k] = rule.default();
                            }
                        } else {
                            rdata[k] = rule.default;
                        }
                        this.__SetChange(k);
                    }
                    return rdata[k];
                },
                set: function(v) {
                    logger.trace('[Data.setter] '+ k + ': '+v);
                    let rdata = GMgrImpl._mgr.__rDataMap.get(key).get(id);
                    // console.log(rdata);

                    // console.log(typeof v, rule.type);
                    if ('function' === typeof v) {
                        logger.warn('[MgrImpl.doCreateData] err: k('+k+') type(must be:'+rule.type+') invalid.');
                        return;
                    }
                    logger.trace('[Data.setter] k:' +k +',', rule.type);
                    switch (rule.type) {
                    case 'array': {
                        if (!(v instanceof Array)) {
                            logger.warn('[MgrImpl.doCreateData] err: k('+k+') type(must be:array) invalid.');
                            return;
                        }
                        break;
                    }
                    case 'ObjectId': {
                        if (!(v instanceof ObjectId)) {
                            logger.warn('[MgrImpl.doCreateData] err: k('+k+') type(must be:ObjectId) invalid.');
                            return;
                        }
                        break;
                    }
                    case 'object': {
                        if (!(v instanceof Object)) {
                            logger.warn('[MgrImpl.doCreateData] err: k('+k+') type(must be:object) invalid.');
                            return;
                        }
                        break;
                    }
                    case 'date': {
                        if (typeof v == 'number') {
                            v = new Date(v);
                        } else if (!(v instanceof Date)) {
                            logger.warn('[MgrImpl.doCreateData] err: k('+k+') type(must be:Date or number) invalid.');
                            return;
                        }
                        break;
                    }
                    default: {
                        if (typeof v != rule.type) {
                            logger.warn('[MgrImpl.doCreateData] err: k('+k+') base type(must be:'+rule.type+') invalid: %j.', v);
                            return;
                        }
                        break;
                    }
                    }

                    rdata[k] = v;
                    // if (k !== '_id') {//些处监听，仅能监测到“根结点数据赋值”,需辅以Data.SetChange函数
                    this.__SetChange(k);
                    // }
                }
            });
            // es5,es6没有对数组进行 getter/setter的解决方案
        }
        // console.log(this.__DataMap.get(key).get(id));
        // 第2种方式，Set,Get函数,先看效率

        if (this.IsDebug()) {
            //数据类型检测
            const srules = this.__RuleMap.get(key);
            for (let k in data) {
                if (rules.has(k)) {
                    if (!srules.CheckPath(k, data[k])) {
                        logger.warn('[MgrImpl.doCreateData] data check key('+k+') err.');
                        if (isCreated) {
                            dataInstance[k] = srules.CheckPathAndReset(rules.get(k), data[k]);
                        }
                    } else {
                        if (isCreated) {
                            dataInstance[k] = data[k];
                        } else {//非新创数据，直接初始化，不走Data映射流程
                            idData[k] = data[k];
                        }
                    }
                } else {
                    logger.warn('[MgrImpl.doCreateData] Dev dbcoc[%j] data key(%j) undefined in rule.', key, k);
                }
            }
        } else {
            for (let k in data) {
                if (rules.has(k)) {
                    if (isCreated) {
                        dataInstance[k] = data[k];
                    } else {//非新创数据，直接初始化，不走Data映射流程
                        idData[k] = data[k];
                    }
                } else {
                    logger.warn('[MgrImpl.doCreateData] Pro dbcoc[%j] data key(%j) undefined in rule.', key, k);
                }
            }
        }

        let defaults = this.__RuleMap.get(key).GetDefaults();
        if (defaults) {
            for (let [k, v] of defaults) {
                if (undefined === data[k]) {
                    logger.trace('[MgrImpl.doCreateData] setDefault for:' + k + ', '+ v);
                    dataInstance[k] = v;
                }
            }
        }
        let defaultsFunc = this.__RuleMap.get(key).GetDefaultsFunc();
        // logger.trace('[MgrImpl.doCreateData] defaultsFunc:', defaultsFunc);
        if (defaultsFunc) {
            for (let [k, v] of defaultsFunc) {
                if (undefined === data[k]) {
                    logger.trace('[MgrImpl.doCreateData] setDefaultFunc for:' + k);
                    if (v === Date) {
                        dataInstance[k] = new v();
                    } else {
                        dataInstance[k] = v();
                    }
                }
            }
        }
        // dataInstance.__isCreated = true;
        // console.log(this.__rDataMap.get(key).get(id), data);
        return dataInstance;
    }
    //DbCoc真实数据封装接口
    AddData([dbName, cocName], data) {
        logger.trace('[MgrImpl.AddData] begin. cocName:', cocName);
        return this.doCreateData([dbName, cocName], data);
    }
    AddDatas([dbName, cocName], datas) {
        logger.trace('[MgrImpl.AddDatas] begin.');
        const res = [];
        datas.forEach(data => {
            res.push(this.AddData([dbName, cocName], data));
        });
        return res;
    }

    // 经测试，该类工厂可用
    static _dataFactory(methods) {
        class SubData extends S_Data {
            constructor(...args) {
                super(...args);
            }
        }
        if (undefined !== methods) {
            for (let [k, v] of methods) {
                SubData.prototype[k] = v;
            }
        }
        return SubData;
    }

    /////////////////////////////////////////////////////////////////////////////
    //在debug下，开启子类型检测
    // release下，关闭
    IsDebug() {
        return this.__opts.IsDebug;
    }
    GetDefaultDbName() {
        return this.__defaultDbName;
    }
    _parseArgs(opts) {
        this._parseArgsDb(opts.db);
        this.__opts.env = opts.env || 'development';
        this.__opts.IsDebug = this.__opts.env === 'development';
        if (opts.logger) {
            this.logger = opts.logger;
            logger = this.logger;
        } else {
            this.logger = logger;
        }

        return true;
    }
    _parseArgsDb(opts) {
        if (undefined === opts) {
            throw new Error('[MgrImpl.parseArgs] err: db opts empty.');
        }
        const MeOpts = this.__opts.db = {};

        if (undefined === opts.databases ||
            !Array.isArray(opts.databases) ||
            opts.databases.length === 0
        ) {
            throw new Error('[MgrImpl.parseArgs] err: databases.');
        }

        MeOpts.host = (undefined === opts.host) ? '127.0.0.1': opts.host;
        MeOpts.port = (undefined === opts.port) ? '27017': opts.port;
        MeOpts.databases = opts.databases;

        if (opts.auth) {
            if (undefined === opts.user || '' === opts.user ||
                undefined === opts.password || '' === opts.password
            ) {
                throw new Error('[MgrImpl.parseArgs] err: auth without user and password.');
            }
            MeOpts.user = opts.user;
            MeOpts.password = opts.password;
            MeOpts.authSource = (undefined === opts.authSource) ? 'admin': opts.authSource;
            if (undefined !== opts.authMechanism) {
                MeOpts.authMechanism = opts.authMechanism;
            }
        }

        // inited mongodb url
        let authUser = '';
        if (opts.auth) {
            authUser = opts.user + ':' + opts.password + '@';
        }
        this.__opts._connStr = 'mongodb://' + authUser + opts.host + ':' + opts.port + '/';
        this.__opts._connOpts = {
            //useNewUrlParser: true
        };

        if (opts.auth) {
            // if (undefined !== opts.hosts) { // 127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019
            //     this.__opts._connStr = 'mongodb://' + authUser + opts.hosts + '/';
            //     this.__opts._connOpts.mongos = opts.mongos || true;//默认为分片副本集
            // }

            if (opts.authMechanism) {
                this.__opts._connOpts.authMechanism = opts.authMechanism;//'MONGODB-CR';
            }
            if (opts.authSource) {
                this.__opts._connOpts.authSource = opts.authSource;
            }
        }

        return true;
    }
    _init() {
        this.__opts.db.databases.forEach(dbName => {
            if (undefined !== this.__DbMap.get(dbName)) {
                return;
            }
            if (undefined === this.__defaultDbName) {
                this.__defaultDbName = dbName;
            }
            this.__DbMap.set(dbName, S_Db(dbName, this));//this指向MgrImpl, initDb
        });
		if (!!!this.__app) {
			this.__app = new Map();
		}
        this._startTick();
    }
    // 定时器
    _startTick() {
        logger.trace('_startTick: begin');
        if (this.__tickT) {
            return;
        }
        this.__tickT = setInterval(() => {
            // if (this.__status != MgrImpl_stage.Running) {
            //     return;
            // }
            this._tick();//量级: 48*20次/100ms
        }, 100);
    }
    _tick() {
        let now = Date.now();
        let saveLimit = G_SaveLimit;
        this._state(now);
        if (this.__status != MgrImpl_stage.Running) {
            logger.trace('[MgrImpl._tick] wait running.');
            return;
        }
        for (let [, coc] of this.__DbCocMap) {
            // console.log(key, coc);
            coc.Tick(now);
            if (saveLimit > 0) {
                saveLimit -= coc.TickSaveMsg(now, saveLimit);
            }
        }
    }
    _state(now) {
        if (this.__nextStatePrint + 10000 > now) {
            return;
        }
        this.__nextStatePrint = now + 10000;
        logger.info('[MgrImpl._state] __status:'+this.__status+
            ', __DbMap:'+this.__DbMap.size+
            ',__DbCocMap:'+this.__DbCocMap.size+
            ',__rDataMap:'+this.__rDataMap.size+
            ',__DataMap:'+this.__DataMap.size+
            ',__RuleMap:'+this.__RuleMap.size+
            ',__SDataMap:'+this.__SDataMap.size);
        for (let [k, rdatas] of this.__rDataMap) {
            logger.info('[MgrImpl._state] __rDataMap k('+k+'): '+ rdatas.size);
        }
    }

    static Instance(opts) {
        if (undefined === MgrImpl._mgr) {
            GMgrImpl._mgr = MgrImpl._mgr = new MgrImpl(opts);
            MgrImpl._createListener();
        }

        return MgrImpl._mgr;
    }
    static _createListener() {
        MgrImpl._mgr.on('connect', MgrImpl._onEvent('connect'));//Db连接成功事件
        MgrImpl._mgr.on('error', MgrImpl._onEvent('error'));
        MgrImpl._mgr.on('timeout', MgrImpl._onEvent('timeout'));
        MgrImpl._mgr.on('close', MgrImpl._onEvent('close'));
        MgrImpl._mgr.on('parseError', MgrImpl._onEvent('parseError'));
        MgrImpl._mgr.on('reconnect', MgrImpl._onEvent('reconnect'));
        MgrImpl._mgr.on('reconnectFailed', MgrImpl._onEvent('reconnectFailed'));
        MgrImpl._mgr.on('serverHeartbeatSucceeded', MgrImpl._onEvent('serverHeartbeatSucceeded'));
        MgrImpl._mgr.on('serverHeartbeatFailed', MgrImpl._onEvent('serverHeartbeatFailed'));
    }

    onConnect() { // 处理连接成功的事务
        //this.initDbCocMap();
        this._initIndex();
    }

    static _onEvent(eventStr, err) {
        return (err, db) => {
            if (MgrImpl._mgr.IsStopped()) {
                return;
            }
            switch (eventStr) {
            case 'connect': {
                MgrImpl._mgr.__DbConnected.add(db);
                if (MgrImpl._mgr.__DbConnected.size === MgrImpl._mgr.__DbMap.size) {
                    MgrImpl._mgr.__status = MgrImpl_stage.Running;
                    MgrImpl._mgr.onConnect();
                }
                break;
            }
            case 'error': {
                // MgrImpl._mgr.__status = MgrImpl_stage.Error;
                break;
            }
            case 'serverHeartbeatFailed':{
                // MgrImpl._mgr.__status = MgrImpl_stage.Error;
                break;
            }
            case 'timeout': {
                // MgrImpl._mgr.__status = Db_status.Error;
                break;
            }
            case 'close': {
                MgrImpl._mgr.__status = MgrImpl_stage.Error;
                break;
            }
            case 'parseError': {
                // MgrImpl._mgr.__status = Db_status.Error;
                break;
            }
            case 'serverHeartbeatSucceeded':{
                MgrImpl._mgr.__status = MgrImpl_stage.Running;
                break;
            }
            case 'reconnect': {
                MgrImpl._mgr.__status = MgrImpl_stage.Running;
                // logger.trace(err._privProp, this._db._privProp);// err此处err是db连接实例
                // this._test();
                break;
            }
            case 'reconnectFailed': {
                // MgrImpl._mgr.__status = Db_status.Close;
                break;
            }
            default:{
                break;
            }
            }
            logger.trace('[MgrImpl._onEvent] eventStr:%j', MgrImpl._mgr.__status, eventStr);
            // this.emit(err);
            // logger.trace(err);
        };
    }
}
// 静态属性
MgrImpl._mgr = undefined;

const GetInstance = function(opts) {
    return MgrImpl.Instance(opts);
};
GetInstance.MgrImplStatic = MgrImpl;//取class

module.exports = GetInstance;