/**
 * Created by Linqy on 2018\7\18 0018.
 */

const Mgr = require('./lib/Mgr');
const mgo = require('./mgo');

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

const logger = console.log;
const coc = require('./UserName');

class UserName {
    constructor(id) {
        this.__id = id;
        this.__data = undefined;
    }
    Create(cb) {
        coc.Create({_id: this.__id, test: 10, name: '123'}, (err, data) => {
            if (err) {
                logger('Create err:', err);
                cb(err);
                return;
            }
            logger('Create data:', data);
            cb(null);
        });
    }
    Login(cb) {
        coc.Load(this.__id, (err, data) => {
            if (err) {
                logger('Login err:', err);
                cb(err);
                return;
            }
            // logger('Login data:', data);
            this.__data = data;
            console.log(this.__data.G_name());
            cb(null);
        })
    }
    Save(cb) {
        logger('Save');
        if (!cb) {
            this.__data.__Save();
        } else {
            this.__data.__Save((err) => {
                cb(err);
            });
        }
    }
}

let id = mgo.ObjectId().toString();
let userName = new UserName(id);
logger('id:%j', id);
new Promise((re, rj) => {
    userName.Create((err) => {
        if (err) {
            rj(err);
        } else {
            re();
        }
    })
}).then(()=>{
    console.log('Create succ');
    userName.Login((err) => {
        console.log(err);
    })
}, (err)=>{
    console.log('Create error:', err);
});