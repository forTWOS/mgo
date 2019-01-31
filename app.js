/**
 * Created by Linqy on 2018\6\28 0027.
 */
var mongodb = require('mongodb'),
    ObjectId = mongodb.ObjectId;
var MongoClient = mongodb.MongoClient;
// const oid = ObjectId();
// console.log(oid, typeof oid);
// var d = new Date();
// console.log(typeof d, d instanceof Date);
// var now1 = Date.now;
// console.log(now1, typeof now1, now1 instanceof Date, now1 === Date.now);
// let n = now1();
// console.log(n, typeof n, new Date(n));
// let dType = Date();
// console.log('dType:', dType, typeof dType, dType === Date, Date());
// let arr = [];
// console.log(arr, typeof arr, arr instanceof Array, arr instanceof Object);
// let fn = ()=>{}
// console.log(fn, typeof fn, fn instanceof Function, fn instanceof Object);
// let fn1 = function(){}
// console.log(fn1, typeof fn1, fn1 instanceof Function, fn1 instanceof Object);
// let uv = undefined;
// console.log(uv, typeof uv, uv === undefined, uv instanceof Object, !!uv, !uv);
// let hashed = 'hashed';
// console.log(!!hashed);
// class testClass {}
// console.log([] instanceof Object, [] instanceof Array, oid instanceof Object, testClass instanceof Object);
// console.log(typeof [], typeof oid, typeof testClass, typeof Boolean, typeof Number, typeof String, typeof Date, typeof Array, typeof Object);
// console.log(typeof false);
// console.log('============');
//
// class MyObject extends Object {
//     constructor(name) {
//         super();
//         this._setter = {};
//         this._setter['name'] = name;
//     }
//     get name() {
//         return this._setter['name'];
//     }
// }
// let mo = new MyObject('my');
// mo.a = 'a';
// console.log(mo, mo.name);
// class MyArray extends Array {
//     constructor(name) {
//         super();
//         this._setterName = name;
//     }
//     get name() {
//         return this._setterName;
//     }
// }
// let ma = new MyArray('ma');
// ma.push(1);
// console.log(ma, ma.name);
// return;

var url = 'mongodb://localhost:27017/thcoc';

var opts = {
    poolSize: 10,
    autoReconnect: true,
    keepAlive: true,
    connectTimeoutMS: 10, // 30default
    reconnectTries: 10000 // 重试次数,30default
};
//opts.authSource = 'admin';
opts.ignoreUndefined = true; //Specify if the BSON serializer should ignore undefined fields.
//opts.auth = {authMechanism: 'MONGODB-CR'};
//opts.loggerLevel = 'debug';
//opts.logger = '';
var createLieten = function(tp, err, db) {
    console.log(tp);
    console.log(err);
    console.log(db);
};
MongoClient.connect(url, opts, function(err, db) {
    if (err != null) {
        throw new Error("connect mongodb error:" + err.toString() );
    }
    console.log("connected success.");
    db.on('error', createLieten.bind(null, 'error'));
    db.on('timeout', createLieten.bind(null, 'timeout'));
    db.on('close', createLieten.bind(null, 'close'));
    db.on('parseError', createLieten.bind(null, 'parseError'));
    db.once('open', createLieten.bind(null, 'open'));
    db.on('reconnect', createLieten.bind(null, 'reconnect'));
    db.on('reconnectFailed', createLieten.bind(null, 'reconnectFailed'));

    //ensureIndex({x:1},{unique:true, dropDups:true});
    findIndexes(db, 'config', (err, res) => {
        console.log(err);
        console.log(res);
    });
    ensureIndex(db, 'config', (err, res) => {
        console.log(err);
        console.log(res);
    });
    // return;
    var i = 0, j = 0;
    // setInterval(function(){
    //     insertDocuments(db, 'config', function() {
    //         // console.log("insert succ:"+(++i));
    //     });
    // }, 10);
    // // return;
    // var t = setInterval(function() {
    //     findDocPage(page++, db, 'config', function(err, res) {
    //             if (err) {
    //                 return;
    //             }
    //             // console.log('find succ:'+(++j));
    //             if (res.length == 0) {
    //                 console.log('find over');
    //                 if (t) {
    //                     clearInterval(t);
    //                     t = null;
    //                 }
    //             }
    //         }
    //     );
    // }, 10);
    // return;
    // var i1 = 0, j1 = 0;
    // setInterval(function(){
    //     insertDocuments(db, 'config1', function() {
    //         console.log("insert succ:"+(++i1));
    //     });
    // }, 100);
    // var t1 = setInterval(function() {
    //     findDocPage(page1++, db, 'config1', function(err, res) {
    //             if (err) {
    //                 return;
    //             }
    //             console.log('find succ:'+(++j1));
    //             if (res.length == 0) {
    //                 console.log('find over');
    //                 if (t1) {
    //                     clearInterval(t1);
    //                     t1 = null;
    //                 }
    //             }
    //         }
    //     );
    // }, 100);
    // return;
    // var t = setInterval(function() {
    //     findDocPage(page++, db, function(err, res) {
    //             if (err) {
    //                 return;
    //             }
    //             console.log('find succ:'+(++j));
    //             if (res.length == 0) {
    //                 console.log('find over');
    //                 if (t) {
    //                     clearInterval(t);
    //                     t = null;
    //                 }
    //             }
    //         }
    //     );
    // }, 100);
    var t = setInterval(function() {
        findDocPage(page, db, 'config', function(err, res) {
            if (err) {
                return;
            }

            if (res.length == 0) {
                console.log('find over');
                if (t) {
                    clearInterval(t);
                    t = null;
                }
                return;
            }
            res.forEach(function(item) {
                updateDoc(item, db, 'config',function(err) {
                    if (err) {
                        return;
                    }
                    if (++j%100 == 0) {
                        console.log("update succ:"+(j));
                    }
                })
            });
        });
    }, 20);
});

const findIndexes = (db, cocname, cb) => {
    let coc = db.collection(cocname);
    coc.listIndexes().toArray(cb);
};
const ensureIndex = (db, cocname, cb) => {
    let coc = db.collection(cocname);
    coc.ensureIndex({uid: 1, oid:1}, {name:'uid_oid'}, cb);
};

function insertDocuments(db, cocname,  cb) {
    var coc = db.collection(cocname);
    var data = [];
    for (var i = 0; i < 10; ++i) {
        var o = JSON.parse(JSON.stringify(obj));
        o._id = mongodb.ObjectId();
        o.ind = i;
        data.push(o);
    }
    // coc.insertOne()
    coc.insertMany(data, function(err, result) {
        if (err) {
            console.log('insert err:' + err.toString());
        }else {
            // console.log(result);
        }
        cb();
    });
}

var page = 0;
var page1 = 0;
var pagesize = 10;
function findDocPage(pg, db, cocname, cb) {
    var coc = db.collection(cocname);
    coc.find({}, {timeout: 10, limit:pagesize, skip: pg*pagesize}).toArray(function(err, docs) {
        if (err) {
            console.log("find err:" + err.toString());
        }
        cb(err, docs);
    });
}

var processData = function(data) {
    //console.log(data.items[0].battle_mode);
    data.items.forEach(function(item) {
        for(var k in item) {
            if (k == 'soldiers' || k == 'adjutants') {
                continue;
            }
            item[k] += 100;
        }
    });
    //console.log(data.items[0].battle_mode, data._id);
};
function updateDoc(dat, db, cocname, cb) {
    var coc = db.collection(cocname);
    processData(dat);
    coc.updateOne({_id: dat._id}, {$set:{items:dat.items}}, function(err, res) {
        if (err) {
            console.log('update err:' + err.toString());
        }
        cb();
    })
}

var obj = {
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