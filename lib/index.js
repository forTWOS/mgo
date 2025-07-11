/**
 * Created by Linqy on 2018\7\14 0014.
 */
const S_Mgr = require('./Mgr');
const S_Rule = require('./Rule');
const mongodb = require('mongodb'),
    ObjectId = mongodb.ObjectId

const initMgo = (dbOpts, logger, tableSetting) => {
    // const dbOpts = {
    //     "auth": false,
    //     "host" : "127.0.0.1",
    //     "port" : "27017",
    //     "databases" : ["thcoc"], // 初始化多个数据库连接
    //     "user" : "",
    //     "password" : "",
    //     "authSource": "admin",
    //     "authMechanism": "SCRAM-SHA-1"
    // };
    const opts ={
        db: dbOpts,
        logger: logger,
		app: tableSetting,
        // IsDebug: true
    };

    // try {
        S_Mgr.Instance().Init(opts);
    // } catch (e) {
    //     throw e;
    // }
};

const IdString = () => { // 经测试，该函数可用
    return new ObjectId().toString();
};

module.exports = {
    initMgo: initMgo,
    S_Rule: S_Rule,
    Load: S_Mgr.Load,
    IdString: IdString,
    ObjectId: ObjectId
};