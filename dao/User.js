/**
 * Created by Linqy on 2018\7\4 0004.
 */

const mgo = require('./mgo');

const signInfoRuleOptsExt = {
    _id: {type: mgo.ObjectId},
    way: {type: String},

};
const signInfoRuleOpts = {
    _id: {type: mgo.ObjectId},
    sVal: {type: String},
    bVal: {type: Boolean},
    nVal: {type: Number},
    dVal: {type: Date},

    // 对象内数组
    nArray: {type: [Number]},//数组不设定默认值，程序会默认为[]
    bArray: {type: [Boolean]},
    sArray: {type: [String]},
    dArray: {type: [Date]},

    // 对象内对象
    subObj: {type: signInfoRuleOptsExt},
};
// defaultValue:若未明确指定
//  'ObjectId': ObjectId()生成惟一值
// 'string': ''
// 'number': 0
// 'boolean': false
// 'date': Date.now
//
// defaultIndex: false
const RuleOpts = {
    tableName: 'user',
    data: {
        _id: {type: mgo.ObjectId}, // auto index
        userName: {type: String, index: true/*||false||'unique'||'hashed'*/}, // 根结点，不用name-hook时，与class名冲突
        desc: {type: String, default: ''},
        tid: {type: mgo.ObjectId},
        banLogin: {type: Boolean},
        banMatch: {type: Boolean, default: true},
        career: {type: Number},
        gold: {type: Number, default: 0},
        dateVal: {type: Date},
        dateValDefaultDate: {type: Date, default: Date},
        dateValDefaultNow: {type: Date, default: Date, index:'hashed'},
        nArray: {type: [Number]},//数组不设定默认值，程序会默认为[]
        bArray: {type: [Boolean]},
        sArray: {type: [String]},
        dArray: {type: [Date]},
        oVal: {type: signInfoRuleOpts},
        oArray: {type: [signInfoRuleOpts]}
        // 不支持[[]]数组内嵌,不应该有这种设计
        // 数组或对象内，不做索引
    }
};
// 实现方案:
// 加载规则时，生成对应map,存储类工厂生产出来的各类
const methods = RuleOpts.methods = {}; //各数据实例操作组

methods.getId = function () {
    return this._id.toString();
};

methods.getIdentity = function() {
    return this.identity || '';
};
methods.setIdentity = function(id) {
    this.identity = id;
};

methods.getInfo = function () {
    var info = {};
    info.uid = this._id.toString();
    if (info.uid) {
        info.identity = this.identity || "";
        info.name = this.name || "";
        info.level = this.level || 1;
        info.exp = this.exp || 0;
        info.sex = this.getSex();
        info.gold = this.gold || 0;
        info.score = this.score || 0;
        info.copper = this.copper || 0;
        info.native = this.native || 0;
        //info.lastlogin = this.getLoginTime();

        return info;
    } else {
        return null;
    }
};

methods.setName = function (newname) {
    if (newname)
        this.name = newname;
};

methods.getName = function () {
    return this.name || "";
};

// 默认男
methods.getSex = function () {
    if(undefined == this.sex){
        this.sex = 1;
    }
    return this.sex;
};


methods.updateLoginTime = function () {
    this.lastlogin = new Date();
};
methods.getLoginTime = function () {
    if (!this.lastlogin) {
        this.lastlogin = new Date();
    }
    return this.lastlogin;
};

methods.setSex = function (sex) {
    this.sex = sex;
};

methods.getLevel = function() {
    return this.level || 1;
};


const UserCoc = mgo.Load(['', RuleOpts]);

UserCoc.findById = function (uid, cb) {
    this.One({_id: uid}, cb);
};
UserCoc.findByIdentity = function (id, cb) {
    this.One({identity: id}, {name: true, identity: true}, cb);
};

UserCoc.findByIds = function (ids, cb) {
    this.Find({_id: {$in: ids}}, cb);
};

UserCoc.findByName = function (name, cb) {
    this.Find({name: name}, {name: true}, cb);
};
UserCoc.findByNames = function (names, cb) {
    this.Find({name: {$in: names}}, {name: true}, cb);
};

module.exports = UserCoc;