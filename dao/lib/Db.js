/**
 * Created by Linqy on 2018\6\28 0027.
 * db连接封装,1个数据库db==1个Db
 */
const util = require('./util');

const EventEmitter = require('events').EventEmitter;
const mongodb = require('mongodb'),
    MongoClient = mongodb.MongoClient;
const Db_status = {
    'Uninited': undefined,
    'Inited': 1,
    'Connted': 2,
    'Error': 3,
    'Close': 4,
    'Stopped': 5
};
const G_MgrImpl = global.MgrImpl;

const DbOpts = {
    poolSize: 10,
    autoReconnect: true,
    keepAlive: true,
    connectTimeoutMS: 10*1000, // 30*3000default
    reconnectTries: 100000000, // 重试次数,30default
    reconnectInterval: 10*1000, // 重连间隔10秒
};
const DbFirstReconnectTries = 5;
//DbOpts.authSource = 'admin';
DbOpts.ignoreUndefined = true; //Specify if the BSON serializer should ignore undefined fields.
//DbOpts.auth = {authMechanism: 'MONGODB-CR'};
//DbOpts.loggerLevel = 'debug';
//DbOpts.logger = '';

module.exports = function(...args) {
    return new Db(...args);
};

class Db extends EventEmitter {
    constructor(dbName, mgr) {
        super();
        this.__dbName = dbName;
        this.__opts = mgr._opts;//因是初始化调用，G_MgrImpl在此处为{},不可使用
        this.__dbOpts = JSON.parse(JSON.stringify(DbOpts));//复制DbOpts
        // 设定连接参数
        if (undefined !== this.__opts._connOpts) {
            for (let k in this.__opts._connOpts) {
                this.__dbOpts[k] = this.__opts._connOpts[k];
            }
        }
        this.__connStr = this.__opts._connStr + this.__dbName;
        this.__status = Db_status.Uninited;
        this.init();
    }
    // 返回coc
    Coc(cocName) {
        if (!this.IsOk()) {
            return undefined;
        }
        return this.__db.collection(cocName);
    }
    // 关闭Db
    Close() {
        this.__status = Db_status.Stopped;
        // this.__db.close();
        this.__db = undefined;
        this.__client.close();
        this.__client = undefined;

        this.__opts = undefined;
    }
    IsOk() {
        return Db_status.Connted == this.__status;
    }
    IsStopped() {
        return Db_status.Stopped == this.__status;
    }
    init() {
        this.__db = null;
        this.__client = null;//mongodb3.1.1
        this.reconnect();
        this.__status = Db_status.Inited;
    }
    // count连接次数
    reconnect(count) {
        if (undefined === count) {
            count = 0;
        } else {
            util.GetLogger().info('[Db.reconnect] count:'+count);
        }
        MongoClient.connect(this.__connStr, this.__dbOpts, (err, client) => {
            if (err != null) {
                if (count === DbFirstReconnectTries) {
                    process.nextTick(()=>{//不可放throw后，会不执行
                        util.GetLogger().error('[Db.reconnect] error: process.exit.');
                        process.exit();
                    });
                    throw new Error("connect mongodb error:" + err.toString());
                } else {
                    util.GetLogger().error('[Db.reconnect] connect('+count+' mongodb error:' + err.toString());
                    this.reconnect(count+1);
                    return;
                }
            }

            this.__client = client;
            this.__db = this.__client.db(this.__dbName);
            this._dbHandler();
            this.__status = Db_status.Connted;
            util.GetLogger().info('connected success.');
            G_MgrImpl._mgr.emit('connect');
            // this._test();
        });
    }
    //db连接事件绑定
    _dbHandler() {
        this.__db.on('error', this._onEvent('error'));
        this.__db.on('timeout', this._onEvent('timeout'));
        this.__db.on('close', this._onEvent('close'));
        this.__db.on('parseError', this._onEvent('parseError'));
        this.__db.on('reconnect', this._onEvent('reconnect'));
        this.__db.on('reconnectFailed', this._onEvent('reconnectFailed'));
    }
    _onEvent(eventStr, err) {
        return (err/*, db*/) => {
            if (this.IsStopped()) {
                return;
            }
            switch(eventStr) {
                case 'error': {
                    this.__status = Db_status.Error;
                    break;
                }
                case 'timeout': {
                    this.__status = Db_status.Error;
                    break;
                }
                case 'close': {
                    this.__status = Db_status.Close;
                    break;
                }
                case 'parseError': {
                    this.__status = Db_status.Error;
                    break;
                }
                case 'reconnect': {
                    this.__status = Db_status.Connted;
                    // util.GetLogger().trace(err._privProp, this.__db._privProp);// err此处err是db连接实例
                    // this._test();
                    break;
                }
                case 'reconnectFailed': {
                    this.__status = Db_status.Close;
                    break;
                }
            }
            util.GetLogger().warn('[Db._onEvent] ', this.__status, eventStr);
            G_MgrImpl._mgr.emit(eventStr);//setTimeout(()=>{}, 2000);
            // util.GetLogger().trace(err);
        };
    }
    // // Add listeners
    // createListener(self, e, object) {
    //     return (err) => {
    //         if(object.listeners(e).length > 0) {
    //             object.emit(e, err, self);
    //         }
    //     };
    // }
    // _test() {
    //     this.__db.collection('config').findOne(function(err, ...data) {
    //         util.GetLogger().trace(err);
    //         util.GetLogger().trace(...data);
    //     });
    // }
}