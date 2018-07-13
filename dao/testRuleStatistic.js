/**
 * Created by Linqy on 2018\7\4 0004.
 */
const Mgr = require('./lib/Mgr');
const mongodb = require('mongodb'),
    ObjectId = mongodb.ObjectId;

//////////////////////////////////
const logger = console.log;
// setTimeout(()=> { //遍开mongodb.connect时，阻塞导致的连接失败



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

const StatisticRule = require('./Statistic');
// const S_Rule = require('./lib/Rule');
const coc = require('./lib/Mgr').Load(['thcoc', 'statistic', StatisticRule]);
// }catch(e) {
//     throw e;
// }

//测试数据

const G_obj = {
    "fightValue_MJ" : 1128.71,
    "fightValue_TF" : 1128.71,
    "fightValue" : 1128.71,
    "items" : [
        {
            "battle_mode" : 3,
            "match_times" : 4,
            "match_victory" : 3,
            "total_die" : 1,
            "total_fj_dead" : 2,
            "total_soldier_dead" : 60,
            "total_kill_player" : 6,
            "total_kill_adjutant" : 5,
            "total_kill_soldier" : 39,
            "total_kill_boss" : 0,
            "total_dmg_player" : 4299,
            "total_dmg_adjutant" : 362,
            "total_dmg_soldier" : 4136,
            "total_dmg_to_player" : 789,
            "total_dmg_to_adjutant" : 433,
            "total_dmg_to_soldier" : 3077,
            "total_dmg_to_boss" : 0,
            "total_be_dmg_player" : 713,
            "total_be_dmg_adjutant" : 0,
            "total_be_dmg_soldier" : 0,
            "total_kill_die" : 0,
            "total_execute" : 6,
            "total_rescue" : 0,
            "total_assists" : 1,
            "total_hit_down" : 6,
            "total_occupy" : 1,
            "total_experience_player" : 3398,
            "total_experience_soldier" : 5320,
            "total_experience_adjutant" : 1308,
            "total_prestige" : 135,
            "total_copper" : 11065,
            "total_exploit" : 0,
            "total_mvp" : 1,
            "total_game_time" : 59,
            "total_score" : 24839,
            "max_kill" : 5,
            "max_dmg" : 2174,
            "max_be_dmg" : 0,
            "max_kill_continue" : 5,
            "max_execute" : 5,
            "max_rescue" : 0,
            "max_occupy" : 1,
            "max_assists" : 1,
            "max_hit_down" : 5,
            "max_experience_player" : 1810,
            "max_experience_soldier" : 2890,
            "max_experience_adjutant" : 710,
            "max_prestige" : 74,
            "max_copper" : 6084,
            "max_exploit" : 0,
            "max_score" : 13488,
            "use_ride" : 0,
            "use_shot" : 0,
            "use_shield" : 4,
            "use_backflag" : 0,
            "use_fashion" : 0,
            "use_horsefashion" : 0,
            "use_onehand" : 0,
            "use_twohand" : 4,
            "use_shortspear" : 4,
            "use_longspear" : 0,
            "use_throwing" : 0,
            "use_crossbow" : 0,
            "use_archshort" : 0,
            "use_archlong" : 0,
            "soldiers" : [
                {
                    "win_count" : 1,
                    "use_count" : 2,
                    "person_id" : 112010
                },
                {
                    "win_count" : 1,
                    "use_count" : 1,
                    "person_id" : 112011
                },
                {
                    "win_count" : 1,
                    "use_count" : 1,
                    "person_id" : 112012
                }
            ],
            "adjutants" : [
                {
                    "win_count" : 3,
                    "use_count" : 4,
                    "person_id" : 803000
                }
            ],
            "contribute" : 1
        },
        {
            "battle_mode" : 11,
            "match_times" : 1,
            "match_victory" : 0,
            "total_die" : 3,
            "total_fj_dead" : 0,
            "total_soldier_dead" : 0,
            "total_kill_player" : 1,
            "total_kill_adjutant" : 0,
            "total_kill_soldier" : 0,
            "total_kill_boss" : 0,
            "total_dmg_player" : 441,
            "total_dmg_adjutant" : 0,
            "total_dmg_soldier" : 0,
            "total_dmg_to_player" : 441,
            "total_dmg_to_adjutant" : 0,
            "total_dmg_to_soldier" : 0,
            "total_dmg_to_boss" : 0,
            "total_be_dmg_player" : 1118,
            "total_be_dmg_adjutant" : 0,
            "total_be_dmg_soldier" : 0,
            "total_kill_die" : 0,
            "total_execute" : 0,
            "total_rescue" : 0,
            "total_assists" : 2,
            "total_hit_down" : 1,
            "total_occupy" : 0,
            "total_experience_player" : 0,
            "total_experience_soldier" : 0,
            "total_experience_adjutant" : 0,
            "total_prestige" : 0,
            "total_copper" : 0,
            "total_exploit" : 0,
            "total_mvp" : 0,
            "total_game_time" : 0,
            "total_score" : 0,
            "max_kill" : 1,
            "max_dmg" : 441,
            "max_be_dmg" : 1118,
            "max_kill_continue" : 1,
            "max_execute" : 0,
            "max_rescue" : 0,
            "max_occupy" : 0,
            "max_assists" : 2,
            "max_hit_down" : 1,
            "max_experience_player" : 0,
            "max_experience_soldier" : 0,
            "max_experience_adjutant" : 0,
            "max_prestige" : 0,
            "max_copper" : 0,
            "max_exploit" : 0,
            "max_score" : 0,
            "use_ride" : 0,
            "use_shot" : 0,
            "use_shield" : 1,
            "use_backflag" : 0,
            "use_fashion" : 1,
            "use_horsefashion" : 0,
            "use_onehand" : 0,
            "use_twohand" : 1,
            "use_shortspear" : 1,
            "use_longspear" : 1,
            "use_throwing" : 0,
            "use_crossbow" : 0,
            "use_archshort" : 0,
            "use_archlong" : 0,
            "soldiers" : [],
            "adjutants" : [],
            "contribute" : 0.5
        },
        {
            "battle_mode" : 101,
            "match_times" : 4,
            "match_victory" : 3,
            "total_die" : 1,
            "total_fj_dead" : 2,
            "total_soldier_dead" : 60,
            "total_kill_player" : 6,
            "total_kill_adjutant" : 5,
            "total_kill_soldier" : 39,
            "total_kill_boss" : 0,
            "total_dmg_player" : 4299,
            "total_dmg_adjutant" : 362,
            "total_dmg_soldier" : 4136,
            "total_dmg_to_player" : 789,
            "total_dmg_to_adjutant" : 433,
            "total_dmg_to_soldier" : 3077,
            "total_dmg_to_boss" : 0,
            "total_be_dmg_player" : 713,
            "total_be_dmg_adjutant" : 0,
            "total_be_dmg_soldier" : 0,
            "total_kill_die" : 0,
            "total_execute" : 6,
            "total_rescue" : 0,
            "total_assists" : 1,
            "total_hit_down" : 6,
            "total_occupy" : 1,
            "total_experience_player" : 3398,
            "total_experience_soldier" : 5320,
            "total_experience_adjutant" : 1308,
            "total_prestige" : 135,
            "total_copper" : 11065,
            "total_exploit" : 0,
            "total_mvp" : 1,
            "total_game_time" : 59,
            "total_score" : 24839,
            "max_kill" : 5,
            "max_dmg" : 2174,
            "max_be_dmg" : 0,
            "max_kill_continue" : 5,
            "max_execute" : 5,
            "max_rescue" : 0,
            "max_occupy" : 1,
            "max_assists" : 1,
            "max_hit_down" : 5,
            "max_experience_player" : 1810,
            "max_experience_soldier" : 2890,
            "max_experience_adjutant" : 710,
            "max_prestige" : 74,
            "max_copper" : 6084,
            "max_exploit" : 0,
            "max_score" : 13488,
            "use_ride" : 0,
            "use_shot" : 0,
            "use_shield" : 4,
            "use_backflag" : 0,
            "use_fashion" : 0,
            "use_horsefashion" : 0,
            "use_onehand" : 0,
            "use_twohand" : 4,
            "use_shortspear" : 4,
            "use_longspear" : 0,
            "use_throwing" : 0,
            "use_crossbow" : 0,
            "use_archshort" : 0,
            "use_archlong" : 0,
            "soldiers" : [
                {
                    "win_count" : 1,
                    "use_count" : 2,
                    "person_id" : 112010
                },
                {
                    "win_count" : 1,
                    "use_count" : 1,
                    "person_id" : 112011
                },
                {
                    "win_count" : 1,
                    "use_count" : 1,
                    "person_id" : 112012
                }
            ],
            "adjutants" : [
                {
                    "win_count" : 3,
                    "use_count" : 4,
                    "person_id" : 803000
                }
            ],
            "contribute" : 1
        },
        {
            "battle_mode" : 102,
            "match_times" : 1,
            "match_victory" : 0,
            "total_die" : 3,
            "total_fj_dead" : 0,
            "total_soldier_dead" : 0,
            "total_kill_player" : 1,
            "total_kill_adjutant" : 0,
            "total_kill_soldier" : 0,
            "total_kill_boss" : 0,
            "total_dmg_player" : 441,
            "total_dmg_adjutant" : 0,
            "total_dmg_soldier" : 0,
            "total_dmg_to_player" : 441,
            "total_dmg_to_adjutant" : 0,
            "total_dmg_to_soldier" : 0,
            "total_dmg_to_boss" : 0,
            "total_be_dmg_player" : 1118,
            "total_be_dmg_adjutant" : 0,
            "total_be_dmg_soldier" : 0,
            "total_kill_die" : 0,
            "total_execute" : 0,
            "total_rescue" : 0,
            "total_assists" : 2,
            "total_hit_down" : 1,
            "total_occupy" : 0,
            "total_experience_player" : 0,
            "total_experience_soldier" : 0,
            "total_experience_adjutant" : 0,
            "total_prestige" : 0,
            "total_copper" : 0,
            "total_exploit" : 0,
            "total_mvp" : 0,
            "total_game_time" : 0,
            "total_score" : 0,
            "max_kill" : 1,
            "max_dmg" : 441,
            "max_be_dmg" : 1118,
            "max_kill_continue" : 1,
            "max_execute" : 0,
            "max_rescue" : 0,
            "max_occupy" : 0,
            "max_assists" : 2,
            "max_hit_down" : 1,
            "max_experience_player" : 0,
            "max_experience_soldier" : 0,
            "max_experience_adjutant" : 0,
            "max_prestige" : 0,
            "max_copper" : 0,
            "max_exploit" : 0,
            "max_score" : 0,
            "use_ride" : 0,
            "use_shot" : 0,
            "use_shield" : 1,
            "use_backflag" : 0,
            "use_fashion" : 1,
            "use_horsefashion" : 0,
            "use_onehand" : 0,
            "use_twohand" : 1,
            "use_shortspear" : 1,
            "use_longspear" : 1,
            "use_throwing" : 0,
            "use_crossbow" : 0,
            "use_archshort" : 0,
            "use_archlong" : 0,
            "soldiers" : [],
            "adjutants" : [],
            "contribute" : 0.5
        },
        {
            "battle_mode" : 103
        }
    ],
    "totalSignin" : 8,
    "maxfightValue" : 1128.71
};
const G_objs = [];
for (let i = 0; i < 100; ++i) {
    let tmp = JSON.parse(JSON.stringify(G_obj));
    tmp._id = ObjectId().toString();
    G_objs.push(tmp);
}

class Statistic {
    constructor(id) {
        this.__id = id;
        this.__data = undefined;
    }
    Create(obj, cb) {
        coc.Create(obj, (err, data) => {
            if (err) {
                logger('Create err: ', err);
                cb(err);
                return;
            }
            // logger('Create data: ', data);
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
            // logger('Load data: ', data);
            cb(null);
        });
    }
    Save() {
        this.__data.Save();
    }
    Gold_add(val, cb) {
        if (typeof val !== 'number') {
            logger("Gold_add val err");
            cb('Gold_add val err');
            return;
        }
        // this.__data.gold1 += val; //  gold1为非User中定义属性，操作无效
        // this.__data.gold += val;
        const items = this.__data.items;
        if (undefined === items) {
            cb('Gold_add items undefined');
            return;
        }

        // this.Save();cb(null);return;
        // cpu无波动!!
        setInterval(()=>{
            // for (let j = 0; j < 100; ++j) {
                for (let i = 0, len = items.length; i < len; ++i) {
                    const tmp = items[i];
                    if (tmp.battle_mode == 101) {
                        for (let k in tmp) {
                            if ('battle_mode' != k && k != 'soldiers' && k != 'adjutants') {
                                tmp[k] += 10;
                            }
                        }
                        break;
                    }
                }
                this.__data.SetChange('items');
            // }
            // console.log(this.__data.items);
            this.Save();
        }, 100);

        cb(null);
    }
}


// const uid = '5964ac6e9ee95b7a59703d6b';
// logger('uid:%j', uid);
// let user0 = new Statistic(uid);
// new Promise(function(re, rj) {
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

const id = G_objs[99]._id;//ObjectId().toString();
logger('id:%j', id);
let user = new Statistic(id);
const p = new Promise(function(re, rj) {
    logger('create start');
    setTimeout(() => {
        user.Create(G_objs[99], (err) => {
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
        // for(let i = 0; i < 10; ++i) {
        //     // logger('create begin');
        //     let id = ObjectId().toString();
        //     // logger('id:%j', id);
        //     let user = new Statistic(id);
        //     user.Create((err) => {
        //         // logger('create over');
        //         if (err) {
        //             logger(err);
        //             return;
        //         }
        //         // logger('create succ');
        //     });
        // }
        for (let i = 0; i < 10; ++i) {
            let tmp = G_objs[i];
            tmp._id = ObjectId().toString();
            let user = new Statistic(id);
            user.Create(tmp, (err) => {
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
