/**
 * Created by Linqy on 2018\6\28 0027.
 * db连接封装,1个数据库db==1个Db
 */
const logger = require('../../Logger');

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
        this._opts = mgr._opts;//因是初始化调用，G_MgrImpl在此处为{},不可使用
        this._dbOpts = JSON.parse(JSON.stringify(DbOpts));//复制DbOpts
        // 设定连接参数
        if (undefined !== this._opts._connOpts) {
            for (let k in this._opts._connOpts) {
                this._dbOpts[k] = this._opts._connOpts[k];
            }
        }
        this._connStr = this._opts._connStr + this.__dbName;
        this._status = Db_status.Uninited;
        this.init();
    }
    // 返回coc
    Coc(cocName) {
        if (!this.IsOk()) {
            return undefined;
        }
        return this._db.collection(cocName);
    }
    // 关闭Db
    Close() {
        this._status = Db_status.Stopped;
        this._db.close();
        this._db = undefined;

        this._opts = undefined;
    }
    IsOk() {
        return Db_status.Connted == this._status;
    }
    IsStopped() {
        return Db_status.Stopped == this._status;
    }
    init() {
        this._db = null;
        this.reconnect();
        this._status = Db_status.Inited;
    }
    // count连接次数
    reconnect(count) {
        if (undefined === count) {
            count = 0;
        } else {
            logger.INFO('[Db.reconnect] count:'+count);
        }
        MongoClient.connect(this._connStr, this._dbOpts, (err, db) => {
            if (err != null) {
                if (count === DbFirstReconnectTries) {
                    process.nextTick(()=>{//不可放throw后，会不执行
                        logger.ERROR('[Db.reconnect] error: process.exit.');
                        process.exit();
                    });
                    throw new Error("connect mongodb error:" + err.toString());
                } else {
                    logger.ERROR('[Db.reconnect] connect('+count+' mongodb error:' + err.toString());
                    this.reconnect(count+1);
                    return;
                }
            }

            this._db = db;
            this._dbHandler();
            this._status = Db_status.Connted;
            logger.INFO('connected success.');
            G_MgrImpl._mgr.emit('connect');
            // this._test();
        });
    }
    //db连接事件绑定
    _dbHandler() {
        this._db.on('error', this._onEvent('error'));
        this._db.on('timeout', this._onEvent('timeout'));
        this._db.on('close', this._onEvent('close'));
        this._db.on('parseError', this._onEvent('parseError'));
        this._db.on('reconnect', this._onEvent('reconnect'));
        this._db.on('reconnectFailed', this._onEvent('reconnectFailed'));
    }
    _onEvent(eventStr, err) {
        return (err/*, db*/) => {
            if (this.IsStopped()) {
                return;
            }
            switch(eventStr) {
                case 'error': {
                    this._status = Db_status.Error;
                    break;
                }
                case 'timeout': {
                    this._status = Db_status.Error;
                    break;
                }
                case 'close': {
                    this._status = Db_status.Close;
                    break;
                }
                case 'parseError': {
                    this._status = Db_status.Error;
                    break;
                }
                case 'reconnect': {
                    this._status = Db_status.Connted;
                    // logger.TRACE(err._privProp, this._db._privProp);// err此处err是db连接实例
                    // this._test();
                    break;
                }
                case 'reconnectFailed': {
                    this._status = Db_status.Close;
                    break;
                }
            }
            logger.WARN('[Db._onEvent] ', this._status, eventStr);
            G_MgrImpl._mgr.emit(eventStr);//setTimeout(()=>{}, 2000);
            // logger.TRACE(err);
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
    //     this._db.collection('config').findOne(function(err, ...data) {
    //         logger.TRACE(err);
    //         logger.TRACE(...data);
    //     });
    // }
}