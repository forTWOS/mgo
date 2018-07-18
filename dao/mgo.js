/**
 * Created by Linqy on 2018\7\14 0014.
 */
const S_Mgr = require('./lib/Mgr');
const S_Rule = require('./lib/Rule');
const mongodb = require('mongodb'),
    ObjectId = mongodb.ObjectId

const initMgo = (dbOpts, logger) => {
    // const dbOpts = {
    //     "auth": false,
    //     "host" : "127.0.0.1",
    //     "port" : "27017",
    //     "databases" : ["thcoc"], // 初始化多个数据库连接
    //     "user" : "xusf",
    //     "password" : "shunfanv5",
    //     "authSource": "admin",
    //     "authMechanism": "SCRAM-SHA-1"
    // };
    const opts ={
        db: dbOpts,
        logger: logger
    };

    try {
        S_Mgr.CreateMgr(opts);
    }catch(e) {
        throw e;
    }
};

const IdString = () => { // 经测试，该函数可用
    return ObjectId().toString();
};

module.exports = {
    initMgo: initMgo,
    S_Rule: S_Rule,
    Load: S_Mgr.Load,
    IdString: IdString,
    ObjectId: ObjectId
};