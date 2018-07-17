/**
 * Created by Linqy on 2018\6\28 0027.
 */
const Mgr = require('./lib/Mgr');
const mongodb = require('mongodb'),
    ObjectId = mongodb.ObjectId;

process.on('uncaughtException', (err) => {
    console.log('uncaughtException:', err);
});
const dbOpts = {
    "auth": false,
    "host" : "127.0.0.1",
    "port" : "27017",
    "databases" : ["thcoc"], // 初始化多个数据库连接
    "user" : "xusf",
    "password" : "shunfanv5",
    "authSource": "admin",
    "authMechanism": "SCRAM-SHA-1"
};
const opts ={
    db: dbOpts
};

try {
    const mgr = Mgr.CreateMgr(opts);// 在connect时，不可输出console阻塞线程
    // mgr.Run();
}catch(e) {
    throw e;
}

//////////////////////////////////
const logger = ()=>{};//console.log;
// setTimeout(()=> { //遍开mongodb.connect时，阻塞导致的连接失败

// try {
const coc = require('./User');
// }catch(e) {
//     throw e;
// }
return;
class User {
    constructor(id) {
        this.__id = id;
        this.__data = undefined;
    }
    Create(cb) {
        coc.Create({_id: ObjectId(this.__id), test: 10, desc:'test', banLogin: false}, (err, data) => {
            if (err) {
                logger('Create err: ', err);
                cb(err);
                return;
            }
            logger('Create data: ', data);
            cb(null);
        });
    }
    Login(cb) {
        coc.Load(this.__id, (err, data) => {
            if (err) {
                logger('Load err: ', err);
                cb(err);
                return;
            }
            this.__data = data;
            //console.log(this.__data);
            cb(null);
        });
    }
    Save(cb) {
        logger('[User.Save] begin');
        if (!cb) {
            this.__data.Save();
        } else {
            this.__data.Save((err) => {
                cb(err);
            });
        }
    }
    Gold_add(val, cb) {
        if (typeof val !== 'number') {
            logger("Gold_add val err");
            cb('Gold_add val err');
            return;
        }
        this.__data.gold1 += val; //  gold1为非User中定义属性，操作无效
        this.__data.gold += val;
        this.__data.oVal.sVal = 'test';
        // console.log(this.__data.gold);
        this.Save();
        cb(null);
    }
}


// const uid = '5b3608d3a83fb42edc2d3331';
// logger('uid:%j', uid);
// let user0 = new User(uid);
// new Promise(function(re, rj) {
//     logger('login start');
//     setTimeout(() => {
//         logger('login start');
//         user0.Login((err) => {
//             logger('login stop');
//             if (err) {
//                 rj(err);
//                 return;
//             }
//             re();
//         });
//     }, 300);
// }).then(function() {
//     logger("Gold_add start");
//     user0.Gold_add(100, (err) => {
//         logger("Gold_add stop");
//         if (err) {
//             return;
//         }
//     });
// },(err) => {
//     logger('login failed');
//     logger(err);
// }).catch((err) => {
//     logger('catch: ', err);
// });
// return;

/// test process: create login gold_add
const id = ObjectId().toString();
logger('id:%j', id);
let user = new User(id);
const p = new Promise(function(re, rj) {
    logger('create start');
    setTimeout(() => {
        user.Create((err) => {
            logger('create stop');
            if (err) {
                rj(err);
                return;
            }
            re();
        });
    }, 300);
}).then(() => {
    logger('login start');
    user.Login((err) => {
        logger('login stop');
        if (err) {
            return;
        }
    });
},(err) => {
    logger('create failed');
    logger(err);
}).then(function() {
    logger("Gold_add start");
    user.Gold_add(100, (err) => {
        logger("Gold_add stop");
        if (err) {
            return;
        }
    });
}).then(function() {
    logger("Gold_add start");
    user.Gold_add(100, (err) => {
        logger("Gold_add stop");
        if (err) {
            return;
        }
    });
}).catch((err) => {
    logger('catch: ', err);
});
// return;
// 100ms/次操作，cpu无耗
// 1ms-10ms/次操作，cpu1%
// 100ms/100次操作,cpu1~2%: 1000次/秒
// 10ms/100次操作,cpu6-10%: 1000次/秒
setTimeout(()=>{
    setInterval(() => {
        for(let i = 0; i < 10; ++i) {
            // logger('create begin');
            let id = ObjectId().toString();
            // logger('id:%j', id);
            let user = new User(id);
            user.Create((err) => {
                // logger('create over');
                if (err) {
                    logger(err);
                    return;
                }
                // logger('create succ');
            });
        }
    }, 10);
}, 100);

// }, 0);