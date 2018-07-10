/**
 * Created by Linqy on 2018\6\28 0027.
 */

// const logger = console.log;
const logger = ()=>{};
const EventEmitter = require('events').EventEmitter;
const mongodb = require('mongodb'),
    ObjectId = mongodb.ObjectId;

const G_MgrImpl = global.MgrImpl = {};//全局：当前为取_mgr

const S_Db = require('./Db');//数据库连接封装
const S_DbCoc = require('./DbCoc');//数据表封装
const S_Data = require('./Data'); // 数据封装
// const S_Rule = require('./Rule'); // 规则封装

const G_SaveLimit = 200;

const MgrImpl_stage = {
    'Uninited' : undefined,
    'Inited' : 1,
    'Running' : 2,
    'Error' : 3,
    'Stoped' : 4
};
class MgrImpl {
    constructor(opts) {
        this.__DbMap = {};
        this.__DbCocMap = {};
        this.__rDataMap = {};
        this.__DataMap = {};
        this.__RuleMap = {}; // coname: Rule
        // this.DataTemplateMap = {};// 继承自Data，根据rule规则生成有hook的各表模板
        // this.Event =
        this.__MsgMap = {};// {dbName+cocName: 1}//消息队列，用于定时在触发DbCoc的真实操作;添加流程:Data.Save->DbCoc.AddMsg->MgrImpl.AddMsg
        this.__tickT = undefined;// 定时器句柄
        this.__status = MgrImpl_stage.Uninited;


        if (!this._parseArgs(opts)) {
            return;
        }
        this._init();

        this.__status = MgrImpl_stage.Inited;
    }
    // return DbCoc=>数据操作
    Load([dbName, cocName, rule]) { // 做成无阻塞的接口，在require初始化
        if (undefined === dbName || undefined === cocName) {
            throw new Error('[MgrImpl.Load] invalid params.');
        }
        if (undefined === this.__DbMap[dbName]) {
            throw new Error('[MgrImpl.Load] uninited dbName.');
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
        this.loadRule(dataKey, rule);
        return this.__DbCocMap[dataKey];
    }

    // 定时器
    _startTick() {
        logger('_startTick: begin');
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
            // console.log(key, this.__DbCocMap[key]);
            this.__DbCocMap[key].Tick(now);
            if (saveLimit > 0) {
                saveLimit -= this.__DbCocMap[key].TickSaveMsg(now, saveLimit);
            }
        }
    }

    loadRule(dataKey, rule) {
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
        // logger(id, typeof id);
        // logger(this.__DataMap);
        if (undefined === this.__DataMap[key] || undefined === this.__DataMap[key][id]) {
            logger('[MgrImpl.GetData] err: key('+key+'), id('+id+') empty.')
            return undefined;
        }
        return this.__DataMap[key][id];
    }
    RemoveData(key, id) {
        if (undefined === this.__DataMap[key] || undefined === this.__DataMap[key][id]) {
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
        const dataInstance = this.doCreateData([dbName, cocName], data);
        dataInstance.__isCreated = true;

        return dataInstance;
    }
    doCreateData([dbName, cocName], data) {
        if (undefined === data._id) {
            logger('[MgrImpl.doCreateData] err: data._id undefined.');
            return null;
        }
        let key = dbName + '/' + cocName;
        let id = data._id.toString();
        logger('[MgrImpl.doCreateData] id:',id, typeof data._id);
        if (undefined !== this.__DataMap[key][id]) {
            logger('[MgrImpl.doCreateData] err: data._id('+id+') duplicate.');
            return this.__DataMap[key][id];
        }

        this.__rDataMap[key][id] = {};
        // logger("__rDataMap size:", Object.keys(this.__rDataMap[key]).length);
        this.__DataMap[key][id] = new S_Data([dbName, cocName], id, data._id);//todo:确认多表数据会不会乱
        const dataInstance = this.__DataMap[key][id];

        // console.log(data);
        // 第一种使用hook函数，cpu无波动
        const rules = this.__RuleMap[key].GetRules();
        for (let k in rules) {
            // console.log(k);//name
            Object.defineProperty(dataInstance, k, {
                get: function() {
                    // let data = this.__rDataMap[key][id];
                    let data = G_MgrImpl._mgr.__rDataMap[key][id];
                    // console.log(this);
                    logger(k + ' getter');
                    if (undefined === data[k]) {
                        if (rules[k].type == 'object') {
                            data[k] = {};
                        } else if (rules[k].type == 'array') {
                            data[k] = [];
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
                    logger(k + ' setter: '+v);
                    // let data = this.__rDataMap[key][id];
                    let data = G_MgrImpl._mgr.__rDataMap[key][id];
                    // console.log(this);

                    // console.log(typeof v, rules[k].type);
                    if ('function' === typeof v) {
                        logger('[MgrImpl.doCreateData] err: k('+k+') type(must be:'+rules[k].type+') invalid.');
                        return;
                    }
                    logger('[Data.setter] k:' +k +',', rules[k].type);
                    switch(rules[k].type) {
                        case 'array': {
                            if (!(v instanceof Array)) {
                                logger('[MgrImpl.doCreateData] err: k('+k+') type(must be:array) invalid.');
                                return;
                            }
                            break;
                        }
                        case 'ObjectId': {
                            if (!(v instanceof ObjectId)) {
                                logger('[MgrImpl.doCreateData] err: k('+k+') type(must be:ObjectId) invalid.');
                                return;
                            }
                            break;
                        }
                        case 'object': {
                            if (!(v instanceof Object)) {
                                logger('[MgrImpl.doCreateData] err: k('+k+') type(must be:object) invalid.');
                                return;
                            }
                            break;
                        }
                        default: {
                            if (typeof v != rules[k].type) {
                                logger('[MgrImpl.doCreateData] err: k('+k+') base type(must be:'+rules[k].type+') invalid.');
                                return;
                            }
                            break;
                        }
                    }

                    data[k] = v;
                    if (k !== '_id') {//些处监听，仅能监测到“根结点数据赋值”,需辅以Data.SetChange函数
                        this.SetChange(k);
                        // this.__changedRoot[k] = 1; // this=> S_Data
                        // this.__changedRootExists = true; // this=> S_Data
                    }
                }
            });
            // es5,es6没有对数组进行 getter/setter的解决方案
        }
        // console.log(this.__DataMap[key][id]);
        // 第2种方式，Set,Get函数,先看效率

        for (let k in data) {
            if (undefined !== dataInstance[k]) {
                dataInstance[k] = data[k];
            }
        }
        let defaults = this.__RuleMap[key].GetDefaults();
        if (defaults) {
            for (let k in defaults) {
                if (undefined === data[k]) {
                    logger('[MgrImpl.doCreateData] setDefault for:' + k + ', '+ defaults[k]);
                    dataInstance[k] = defaults[k];
                }
            }
        }
        let defaultsFunc = this.__RuleMap[key].GetDefaultsFunc();
        if (defaultsFunc) {
            for (let k in defaultsFunc) {
                if (undefined === data[k]) {
                    logger('[MgrImpl.doCreateData] setDefaultFunc for:' + k + ', '+ defaults[k]);
                    dataInstance[k] = defaultsFunc[k]();
                }
            }
        }
        // dataInstance.__isCreated = true;
        // console.log(this.__rDataMap[key][id], data);
        return dataInstance;
    }
    //DbCoc真实数据封装接口
    AddData([dbName, cocName], data) {
        return this.doCreateData([dbName, cocName], data);
    }
    AddDatas([dbName, cocName], datas) {
        let key = dbName + '/' + cocName;
        const res = [];
        datas.forEach(data => {
            res.push(this.AddData([dbName, cocName], data));
        });
        return res;
    }



    /////////////////////////////////////////////////////////////////////////////
    _parseArgs(opts) {
        this._opts = {};
        this._parseArgsDb(opts.db);

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
        MeOpts.port = (undefined === opts.port) ? '127.0.0.1': opts.port;
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
            this.__DbMap[dbName] = S_Db(dbName, this);//this指向MgrImpl, initDb
        });
        this._startTick();
    }

    static Instance(opts) {
        if (null == MgrImpl._mgr) {
            G_MgrImpl._mgr = MgrImpl._mgr = new MgrImpl(opts);
        }

        return MgrImpl._mgr;
    }
}
// 静态属性
MgrImpl._mgr = null;

const GetInstance = function(opts) {
    return MgrImpl.Instance(opts);
};
GetInstance.MgrImplStatic = MgrImpl;//取class

module.exports = GetInstance;