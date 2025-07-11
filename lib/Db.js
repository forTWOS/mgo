/**
 * Created by Linqy on 2018\6\28 0027.
 * db连接封装,1个数据库db==1个Db
 */
const { PassThrough } = require('stream');
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
const GMgrImpl = global.MgrImpl;

const DbOpts = {
    minPoolSize: 10,
    heartbeatFrequencyMS: 5000,
    connectTimeoutMS: 5000, // 30*3000default
    socketTimeoutMS: 5000,
    // timeoutMS:5,
    // waitQueueTimeoutMS:5,
    serverSelectionTimeoutMS: 5*1000,
};
const DbFirstReconnectTries = 5;
//DbOpts.authSource = 'admin';
//DbOpts.ignoreUndefined = true; //Specify if the BSON serializer should ignore undefined fields.
//DbOpts.auth = {authMechanism: 'MONGODB-CR'};
//DbOpts.loggerLevel = 'debug';
//DbOpts.logger = '';

class Db extends EventEmitter {
    constructor(dbName, mgr) {
        super();
        this.__dbName = dbName;
        this.__opts = mgr.__opts;//因是初始化调用，GMgrImpl在此处为{},不可使用
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
    Db(cocName) {
        if (!this.IsOk()) {
            return null;
        }
        return this.__client.db(this.__dbName)
    }
    // 返回coc
    Coc(cocName) {
        if (!this.IsOk()) {
            return null;
        }
        return this.__client.db(this.__dbName).collection(cocName);
    }
    // 关闭Db
    Close() {
        this.__status = Db_status.Stopped;
        // this.__db.close();
        this.__db = null;
        this.__client.close();
        this.__client = null;

        this.__opts = null;
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
        util.GetLogger().debug('[Db.reconnect] __connStr:%j, __dbOpts:%j.' , this.__connStr, this.__dbOpts);
        this.__client = new MongoClient(this.__connStr, this.__dbOpts);
        this.__client.connect()
        .then(() => {
            this.__db = this.__client.db(this.__dbName);
            // this._dbHandler();
            this.__status = Db_status.Connted;
            util.GetLogger().info('connected success.');
            GMgrImpl._mgr.emit('connect', null, this.__dbName);
            // this._test();
        })
        .catch((err) => {
            if (err) {
                // if (count === DbFirstReconnectTries) {
                //     process.nextTick(()=>{//不可放throw后，会不执行
                //         util.GetLogger().error('[Db.reconnect] error: process.exit.');
                //         process.exit();
                //     });
                //     throw new Error('connect mongodb error:' + err.toString());
                // } else {
                    util.GetLogger().error('[Db.reconnect] connect('+count+' mongodb error:' + err.toString());
                    count++
                    if (count > DbFirstReconnectTries) {
                        count = DbFirstReconnectTries;
                    }
                    setTimeout(() => {
                        this.reconnect();
                    }, count*1000);
                    return;
                // }
            }
        })
        .finally(/*() => client.close()*/);
    }
    //db连接事件绑定
    _dbHandler() {
        this.__client.on('error', this._onEvent('error'));
        this.__client.on('timeout', this._onEvent('timeout'));
        this.__client.on('close', this._onEvent('close'));
        this.__client.on('parseError', this._onEvent('parseError'));
        this.__client.on('reconnect', this._onEvent('reconnect'));
        this.__client.on('reconnectFailed', this._onEvent('reconnectFailed'));
        this.__client.on('serverHeartbeatSucceeded', this._onEvent('serverHeartbeatSucceeded'));
        this.__client.on('serverHeartbeatFailed', this._onEvent('serverHeartbeatFailed'));
    }
    _onEvent(eventStr, err) {
        return (/*err, db*/) => {
            if (this.IsStopped()) {
                return;
            }
            switch (eventStr) {
            case 'error': {
                this.__status = Db_status.Error;
                break;
            }
            case 'serverHeartbeatFailed':{
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
            case 'serverHeartbeatSucceeded':{
                this.__status = Db_status.Connted;
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
            default: break;
            }
            util.GetLogger().warn('[Db._onEvent] ', this.__status, eventStr);
            GMgrImpl._mgr.emit(eventStr);//setTimeout(()=>{}, 2000);
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
module.exports = function(...args) {
    return new Db(...args);
};