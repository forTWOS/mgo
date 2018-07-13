/**
 * Created by Linqy on 2018\7\4 0004.
 */

const mongodb = require('mongodb'),
    ObjectId = mongodb.ObjectId;
const S_Rule = require('./lib/Rule');

const signInfoRuleOptsExt = {
    _id: {type: ObjectId},
    way: {type: String},

};
const signInfoRuleOpts = {
    _id: {type: ObjectId},
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
        _id: {type: ObjectId}, // auto index
        userName: {type: String, index: true/*||false||'unique'||'hashed'*/}, // 根结点，不用name-hook时，与class名冲突
        desc: {type: String, default: ''},
        tid: {type: ObjectId},
        banLogin: {type: Boolean},
        banMatch: {type: Boolean, default: true},
        career: {type: Number},
        gold: {type: Number, default: 0},
        dateVal: {type: Date},
        dateValDefaultDate: {type: Date, default: Date},
        dateValDefaultNow: {type: Date, default: Date.now, index:'hashed'},
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
const UserRule = S_Rule(RuleOpts);
// console.log(UserRule._rules.oVal.typeExt.subObj);
module.exports = UserRule;