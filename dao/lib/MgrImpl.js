/**
 * Created by Linqy on 2018\6\28 0027.
 */

let logger = require('./Logger');//如无设置，默认
const EventEmitter = require('events').EventEmitter;
const mongodb = require('mongodb'),
    ObjectId = mongodb.ObjectId;

const G_MgrImpl = global.MgrImpl = {};//全局：当前为取_mgr

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

        this.__DbMap = {};
        this.__DbCocMap = {};
        this.__rDataMap = {};
        this.__DataMap = {};
        this.__RuleMap = {}; // coname: Rule
        // this.DataTemplateMap = {};// 继承自Data，根据rule规则生成有hook的各表模板
        // this.Event =
        // this.__MsgMap = {};// {dbName+cocName: 1}//消息队列，用于定时在触发DbCoc的真实操作;添加流程:Data.Save->DbCoc.AddMsg->MgrImpl.AddMsg
        this.__tickT = undefined;// 定时器句柄
        this.__status = MgrImpl_stage.Uninited;
        this.__nextStatePrint = 0;//下次状态打印时间
        this.__defaultDbName = undefined;// 默认dbName，取配置的第1个


        if (!this._parseArgs(opts)) {
            return;
        }
        this._init();

        this.__status = MgrImpl_stage.Inited;
    }
    // return DbCoc=>数据操作
    Load([dbName, ruleOpts]) { // 做成无阻塞的接口，在require初始化
        const rule = S_Rule(ruleOpts);//规则化-检测

        let cocName = rule.GetTableName();
        if (undefined === cocName) {
            throw new Error('[MgrImpl.Load] invalid params.');
        }
        if (!dbName) {
            dbName = this.__defaultDbName;
        }
        if (undefined === this.__DbMap[dbName]) {
            throw new Error('[MgrImpl.Load] uninited dbName('+dbName+').');
        }
        let dataKey = dbName+'/'+cocName;
        if (undefined === this.__DbCocMap[dataKey]) {
            this.__DbCocMap[dataKey] = {};
        }
        // if (undefined !== this.__DbCocMap[dbName][cocName]) {
        //     return this.__DbCocMap[dbName][cocName];
        // }
        // this.__status = MgrImpl_stage.Running;

        this.__DbCocMap[dataKey] = S_DbCoc([dbName, cocName]);
        this.__rDataMap[dataKey] = {};
        this.__DataMap[dataKey] = {};
        this._loadRule(dataKey, rule);
        return this.__DbCocMap[dataKey];
    }

    IsStopped() {
        return this.__status == MgrImpl_stage.Stoped;
    }

    _loadRule(dataKey, rule) {
        if (undefined !== this.__RuleMap[dataKey]) {
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

        this.__RuleMap[dataKey] = rule;
        // this.DataTemplateMap[dataKey] = tmpClass;
    }
    GetRule(dataKey) {
        return this.__RuleMap[dataKey];
    }

    // 用于映射真实数据
    // DbCoc使用
    GetData(key, id) {
        // logger.TRACE(id, typeof id);
        // logger.TRACE(this.__DataMap);
        if (undefined === this.__DataMap[key] || undefined === this.__DataMap[key][id]) {
            logger.WARN('[MgrImpl.GetData] err: key('+key+'), id('+id+') empty.')
            return undefined;
        }
        return this.__DataMap[key][id];
    }
    RemoveData(key, id) {
        if (undefined === this.__DataMap[key] || undefined === this.__DataMap[key][id]) {
            logger.WARN('[MgrImpl.RemoveData] err: key('+key+'), id('+id+') not exists.');
            return;
        }
        this.__DataMap[key][id] = undefined;
        delete this.__DataMap[key][id];
        this.__rDataMap[key][id] = undefined;
        delete this.__rDataMap[key][id];
    }
    GetRData(key, id) {
        if (undefined === this.__rDataMap[key] || undefined === this.__rDataMap[key][id]) {
            return undefined;
        }
        return this.__rDataMap[key][id];
    }
    GetDbCoc(key) {
        return this.__DbCocMap[key];
    }
    GetDb(dbName) {
        return this.__DbMap[dbName];
    }

    //DbCoc真实数据封装接口
    // data需是对象
    CreateData([dbName, cocName], data) {
        logger.TRACE('[MgrImpl.CreateData] begin.');
        const dataInstance = this.doCreateData([dbName, cocName, true], data);
        if (!dataInstance) {
            return null;
        }
        dataInstance.__isCreated = true;

        return dataInstance;
    }
    doCreateData([dbName, cocName, isCreated], data) {
        // if (undefined === data._id) {// 若未设，将自动创建 Rule
        //     logger.WARN('[MgrImpl.doCreateData] err: data._id undefined.');
        //     return null;
        // }
        let key = dbName + '/' + cocName;
        let id = data._id.toString();
        logger.TRACE('[MgrImpl.doCreateData] id:',id, typeof data._id);
        if (undefined !== this.__DataMap[key][id]) {
            logger.WARN('[MgrImpl.doCreateData] err: data._id('+id+') duplicate.');
            return this.__DataMap[key][id];
        }

        const rules = this.__RuleMap[key].GetRules();

        this.__rDataMap[key][id] = {};
        // logger.TRACE("__rDataMap size:", Object.keys(this.__rDataMap[key]).length);
        this.__DataMap[key][id] = new S_Data([dbName, cocName], id, data._id);
        const dataInstance = this.__DataMap[key][id];

        // console.log(data);
        // 第一种使用hook函数，cpu无波动
        for (let k in rules) {
            // console.log(k);//name
            Object.defineProperty(dataInstance, k, {
                get: function() {
                    // let data = this.__rDataMap[key][id];
                    let data = G_MgrImpl._mgr.__rDataMap[key][id];
                    // console.log(this);
                    logger.TRACE('[Data.getter] ' + k);
                    if (undefined === data[k]) {
                        if (rules[k].type == 'object') {
                            data[k] = {};
                        } else if (rules[k].type == 'array') {
                            data[k] = [];
                        } else if (rules[k].default instanceof Function) {
                            if (rules[k].default === Date) {
                                data[k] = new rules[k].default();
                            } else {
                                data[k] =rules[k].default();
                            }
                        } else {
                            data[k] = rules[k].default;
                        }
                        this.SetChange(k);
                        // this.__changedRoot[k] = 1; // this=> S_Data
                        // this.__changedRootExists = true;
                    }
                    return data[k];
                },
                set: function(v) {
                    logger.TRACE('[Data.setter] '+ k + ': '+v);
                    // let data = this.__rDataMap[key][id];
                    let data = G_MgrImpl._mgr.__rDataMap[key][id];
                    // console.log(this);

                    // console.log(typeof v, rules[k].type);
                    if ('function' === typeof v) {
                        logger.WARN('[MgrImpl.doCreateData] err: k('+k+') type(must be:'+rules[k].type+') invalid.');
                        return;
                    }
                    logger.TRACE('[Data.setter] k:' +k +',', rules[k].type);
                    switch(rules[k].type) {
                        case 'array': {
                            if (!(v instanceof Array)) {
                                logger.WARN('[MgrImpl.doCreateData] err: k('+k+') type(must be:array) invalid.');
                                return;
                            }
                            break;
                        }
                        case 'ObjectId': {
                            if (!(v instanceof ObjectId)) {
                                logger.WARN('[MgrImpl.doCreateData] err: k('+k+') type(must be:ObjectId) invalid.');
                                return;
                            }
                            break;
                        }
                        case 'object': {
                            if (!(v instanceof Object)) {
                                logger.WARN('[MgrImpl.doCreateData] err: k('+k+') type(must be:object) invalid.');
                                return;
                            }
                            break;
                        }
                        case 'date': {
                            if (typeof v == 'number') {
                                v = new Date(v);
                            } else if (!(v instanceof Date)) {
                                logger.WARN('[MgrImpl.doCreateData] err: k('+k+') type(must be:Date or number) invalid.');
                                return;
                            }
                            break;
                        }
                        default: {
                            if (typeof v != rules[k].type) {
                                logger.WARN('[MgrImpl.doCreateData] err: k('+k+') base type(must be:'+rules[k].type+') invalid.');
                                return;
                            }
                            break;
                        }
                    }

                    data[k] = v;
                    // if (k !== '_id') {//些处监听，仅能监测到“根结点数据赋值”,需辅以Data.SetChange函数
                        this.SetChange(k);
                        // this.__changedRoot[k] = 1; // this=> S_Data
                        // this.__changedRootExists = true; // this=> S_Data
                    // }
                }
            });
            // es5,es6没有对数组进行 getter/setter的解决方案
        }
        // console.log(this.__DataMap[key][id]);
        // 第2种方式，Set,Get函数,先看效率

        if (this.IsDebug()) {
            //数据类型检测
            const srules = this.__RuleMap[key];
            for (let k in data) {
                if (undefined !== rules[k]) {
                    if (!srules.CheckPath(k, data[k])) {
                        logger.WARN('[MgrImpl.doCreateData] data check key('+k+') err.');
                        if (isCreated) {
                            dataInstance[k] = srules.CheckPathAndReset(rules[k], data[k]);
                        }
                    } else {
                        dataInstance[k] = data[k];
                    }
                } else {
                    logger.WARN('[MgrImpl.doCreateData] data key('+k+') undefined in rule.');
                }
            }
        }

        let defaults = this.__RuleMap[key].GetDefaults();
        if (defaults) {
            for (let k in defaults) {
                if (undefined === data[k]) {
                    logger.TRACE('[MgrImpl.doCreateData] setDefault for:' + k + ', '+ defaults[k]);
                    dataInstance[k] = defaults[k];
                }
            }
        }
        let defaultsFunc = this.__RuleMap[key].GetDefaultsFunc();
        // logger.TRACE('[MgrImpl.doCreateData] defaultsFunc:', defaultsFunc);
        if (defaultsFunc) {
            for (let k in defaultsFunc) {
                if (undefined === data[k]) {
                    logger.INFO('[MgrImpl.doCreateData] setDefaultFunc for:' + k);
                    if (defaultsFunc[k] === Date) {
                        dataInstance[k] = new defaultsFunc[k]();
                    } else {
                        dataInstance[k] = defaultsFunc[k]();
                    }
                }
            }
        }
        // dataInstance.__isCreated = true;
        // console.log(this.__rDataMap[key][id], data);
        return dataInstance;
    }
    //DbCoc真实数据封装接口
    AddData([dbName, cocName], data) {
        logger.TRACE('[MgrImpl.AddData] begin.');
        return this.doCreateData([dbName, cocName], data);
    }
    AddDatas([dbName, cocName], datas) {
        logger.TRACE('[MgrImpl.AddDatas] begin.');
        const res = [];
        datas.forEach(data => {
            res.push(this.AddData([dbName, cocName], data));
        });
        return res;
    }

    /////////////////////////////////////////////////////////////////////////////
    //在debug下，开启子类型检测
    // release下，关闭
    IsDebug() {
        return this._opts.IsDebug;
    }
    GetDefaultDbName() {
        return this.__defaultDbName;
    }
    _parseArgs(opts) {
        this._opts = {};
        this._parseArgsDb(opts.db);
        this._opts.env = opts.env || 'development';
        this._opts.IsDebug = this._opts.env === 'development';
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
        const MeOpts = this._opts.db = {};

        if (undefined === opts.databases
            || !Array.isArray(opts.databases)
            || opts.databases.length === 0
        ) {
            throw new Error('[MgrImpl.parseArgs] err: databasees.');
        }

        MeOpts.host = (undefined === opts.host) ? '127.0.0.1': opts.host;
        MeOpts.port = (undefined === opts.port) ? '27017': opts.port;
        MeOpts.databases = opts.databases;

        if (opts.auth) {
            if (undefined === opts.user || '' === opts.user
                || undefined === opts.password || '' === opts.password
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
        this._opts._connStr = 'mongodb://' + authUser + opts.host + ':' + opts.port + '/';
        this._opts._connOpts = {};

        if (opts.auth) {
            if (opts.authMechanism) {
                this._opts._connOpts.authMechanism = opts.authMechanism;//'MONGODB-CR';
            }
            if (opts.authSource) {
                this._opts._connOpts.authSource = opts.authSource;
            }
        }

        return true;
    }
    _init() {
        this._opts.db.databases.forEach(dbName => {
            if (undefined !== this.__DbMap[dbName]) {
                return;
            }
            if (undefined === this.__defaultDbName) {
                this.__defaultDbName = dbName;
            }
            this.__DbMap[dbName] = S_Db(dbName, this);//this指向MgrImpl, initDb
        });
        this._startTick();
    }

    // 定时器
    _startTick() {
        logger.TRACE('_startTick: begin');
        if (undefined !== this.__tickT) {
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
        for (let key in this.__DbCocMap) {
            this._state(now);
            if (this.__status != MgrImpl_stage.Running) {
                logger.TRACE('[MgrImpl._tick] wait running.');
                return;
            }
            // console.log(key, this.__DbCocMap[key]);
            this.__DbCocMap[key].Tick(now);
            if (saveLimit > 0) {
                saveLimit -= this.__DbCocMap[key].TickSaveMsg(now, saveLimit);
            }
        }
    }
    _state(now) {
        if (this.__nextStatePrint + 10000 > now) {
            return;
        }
        this.__nextStatePrint = now + 10000;
        logger.INFO('[MgrImpl._state] __status:'+this.__status+
            ', __DbMap:'+Object.keys(this.__DbMap).length+
            ',__DbCocMap:'+Object.keys(this.__DbCocMap).length+
            ',__rDataMap:'+Object.keys(this.__rDataMap).length+
            ',__DataMap:'+Object.keys(this.__DataMap).length+
            ',__RuleMap:'+Object.keys(this.__RuleMap).length);
        for (let k in this.__rDataMap) {
            logger.INFO('[MgrImpl._state] __rDataMap k('+k+'): '+ Object.keys(this.__rDataMap[k]).length);
        }
    }

    static Instance(opts) {
        if (null == MgrImpl._mgr) {
            G_MgrImpl._mgr = MgrImpl._mgr = new MgrImpl(opts);
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
    }
    static _onEvent(eventStr, err) {
        return (err/*, db*/) => {
            if (MgrImpl._mgr.IsStopped()) {
                return;
            }
            switch(eventStr) {
                case 'connect': {
                    MgrImpl._mgr.__status = MgrImpl_stage.Running;
                    break;
                }
                case 'error': {
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
                case 'reconnect': {
                    MgrImpl._mgr.__status = MgrImpl_stage.Running;
                    // logger.TRACE(err._privProp, this._db._privProp);// err此处err是db连接实例
                    // this._test();
                    break;
                }
                case 'reconnectFailed': {
                    // MgrImpl._mgr.__status = Db_status.Close;
                    break;
                }
            }
            logger.TRACE('[MgrImpl._onEvent] ', MgrImpl._mgr._status, eventStr);
            // this.emit(err);
            // logger.TRACE(err);
        };
    }
}
// 静态属性
MgrImpl._mgr = null;

const GetInstance = function(opts) {
    return MgrImpl.Instance(opts);
};
GetInstance.MgrImplStatic = MgrImpl;//取class

module.exports = GetInstance;