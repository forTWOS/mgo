/**
 * Created by Linqy on 2018\6\28 0027.
 * 使用参考testRule.js
 */

const mongodb = require('mongodb'),
    ObjectId = mongodb.ObjectId;
const util = require('./util');

/*
* {
*     tableName: 'user',
*     data:
*     {
*         keyName: {type: number, default: 0} // default对应函数时
*     }
* }
*
* type:
*     number - 支持
*     string - 支持
*     bool - 支持
*     date - 支持
*     ObjectId - 支持
*     object-embedded - 内嵌文档 - 支持
*     array: - 支持
*         [string]
*         [bool]
*         [number]
*         [date]
*         [ObjectId]
*         [object]
*     mixed-自定义 - 不 支持
* index:
*     true - 支持
*     hashed - 支持
*     unique - 支持
*     '2d', sparse: true
*     {type:'2dsphere', sparse: true}
*     {unique: true, expires: '1d'}
*     {expires: 60}
*     {unique: true, sparse: true}
* */

const RuleDataType = [
    ObjectId,// 'function'
    Boolean,//'function'
    Number,//'function'
    String,//'function'
    Date,//'function'
    Array,//'function'
    Object,//'function'
];
const RuleDataTypeStr = [
    'ObjectId',
    'boolean',
    'number',
    'string',
    'date',
    'array',
    'object',
];
const RuleDataDefault = [
    ObjectId,// ObjectId,//程序限定，默认值为ObjectId函数
    false,// Boolean,
    0,// Number,
    '',// String,
    Date,//Date.now,//程序限定，默认值为Date函数
    [],// Array,
    {},// Object,
];

const RuleDeepLimit = 5;

// 说明:
// 规则检测，是初始操作，深入遍历检测
// 1.类型检测
// 2.default值检测
//    object与array
// 3.index检测
// 组织
//    {type: 'array', typeExt: signInfoRuleOpts, default: [], index: false}
//    {type: 'object', typeExt: signInfoRuleOpts, default: {}, index: false}
// 使用方式
//    在Data层，定义根结点getter/setter
// 使用时机
class Rule {
    constructor(opts) {
        this._rules = {};// {keyname: {type: xx, default: xx}}
        this._indexes = {};

        // default value
        this._defaults = {};//有显式设定的default,_id自动ObjectId
        this._defaultsExists = false;
        this._defaultsFunc = {};//默认值是函数的
        this._defaultsFuncExists = false;
        this._methods = {};

        this.parseOpts(opts);
    }

    GetRules() {
        return this._rules;
    }
    GetIndexes() {
        return this._indexes;
    }
    GetDefaults() {
        if (!this._defaultsExists) {
            return undefined;
        }
        return this._defaults;
    }
    GetDefaultsFunc() {
        if (!this._defaultsFuncExists) {
            return undefined;
        }
        return this._defaultsFunc;
    }
    GetTableName() {
        return this._tableName;
    }
    GetMethods() {
        return this._methods;
    }

    // Check头函数，仅做检查，不可依赖其内其它功能(生产环境，关闭Check)
    // 按规则检测数据，并将异常数据初始化
    CheckPathAndReset(rule, data) {
        util.GetLogger().trace('[Rule.CheckPathAndReset] begin.', rule.type, typeof data);
        let dataType = rule.type;
        switch (dataType) {
        case 'string': {
            if (dataType != typeof data) {
                return rule.default;
            }
            return data;
        }
        case 'number': {
            if (dataType != typeof data) {
                return rule.default;
            }
            return data;
        }
        case 'boolean': {// true || false
            if (dataType != typeof data) {
                return rule.default;
            }
            return data;
        }
        case 'date': { // Date || Date.now
            if (dataType != typeof data) {
                if ('number' == typeof data) {
                    return new Date(data);
                }
                return new Date();
            }
            return data;
        }
        case 'ObjectId': {// ObjectId
            if (!(data instanceof ObjectId)) {
                return rule.default();
            }
            return data;
        }
        case 'array': {
            if (!(data instanceof Array)) {
                return [];
            }
            for (let j = 0; j < data.length; ++j) {
                if (undefined !== data[j]) {
                    data[j] = this.CheckPathAndReset(rule.typeExt, data[j]);
                }
            }
            return data;
        }
        case 'object': {
            for (let k in rule.typeExt) {
                if (undefined !== data[k]) {
                    data[k] = this.CheckPathAndReset(rule.typeExt[k], data[k]);
                }
            }
            return data;
        }
        default: {
            util.GetLogger().warn('[Rule.CheckPathAndReset] should not here.' + dataType);
            break;
        }
        }//switch(tmpData.type)

        return undefined;
    }
    CheckPath(path, data) {//path是根结点,该结点数据
        util.GetLogger().trace('[Rule.CheckPath] begin:'+path, typeof data);
        if (undefined === this._rules[path] && undefined !== data) {
            return false;
        }
        let rule = this._rules[path];
        util.GetLogger().trace('[Rule.CheckPath] rule.type:', rule.type);
        if (rule.type != 'object' && rule.type != 'array') {
            return true;
        }
        return this._checkPath(rule, data);
        // for (let k in rule.typeExt) {console.log(k, data[k]);
        //     if (undefined !== data[k] && !this._checkPath(rule.typeExt[k], data[k])) {
        //         return false;
        //     }
        // }
        // //基础类型，在设置时，即有检测类型
        // return true;
    }
    _checkPath(rule, data) {
        util.GetLogger().trace('[Rule._checkPath] begin need(' + rule.type + '), data('+ typeof data+')');
        let dataType = rule.type;
        switch (dataType) {
        case 'string': {
            return 'string' == typeof data;
        }
        case 'number': {
            return 'number' == typeof data;
        }
        case 'boolean': {// true || false
            return 'boolean' == typeof data;
        }
        case 'date': { // Date || Date.now
            return data instanceof Date;
        }
        case 'ObjectId': {// ObjectId
            return data instanceof ObjectId;
        }
        case 'array': {
            if (!(data instanceof Array)) {
                return false;
            }
            for (let j = 0; j < data.length; ++j) {
                if (undefined !== data[j] && !this._checkPath(rule.typeExt, data[j])) {
                    return false;
                }
            }
            break;
        }
        case 'object': {
            if (!data) {
                return false;
            }
            for (let k in rule.typeExt) {
                if (undefined !== data[k] && !this._checkPath(rule.typeExt[k], data[k])) {
                    util.GetLogger().warn('[Rule._checkPath] failed: '+k+',must('+ rule.typeExt[k].type + '),check failed.');
                    return false;
                }
            }
            break;
        }
        default: {
            util.GetLogger().warn('[Rule._checkPath] should not here.');
            break;
        }
        }//switch(tmpData.type)

        return true;
    }

    parseOpts(opts) {
        if (undefined !== opts.tableName && 'string' === typeof opts.tableName) {
            this._tableName = opts.tableName;
        } else {
            throw new Error('[Rule.parseOpts] err: tableName undefined.');
        }
        if (undefined === opts.data || 'object' !== typeof opts.data) {
            throw new Error('[Rule.parseOpts] err: data undefined.');
        }

        let data = opts.data;
        if (undefined === data._id) {
            throw new Error('[Rule.parseOpts] err: data._id undefined.');
        }

        // 类型检测
        this._parseOpts_typeCheck(data);
        if (undefined !== opts.methods) {
            this._methods = opts.methods;
        }
    }

    // 类型检测
    // 完整遍历检测-是否合乎规范
    _parseOpts_typeCheck(data) {
        for (let k in data) {
            const tmpData = data[k];
            //<-- tmpData.type类型检测
            if (undefined === tmpData.type) {
                throw new Error('[Rule.parseOpts] err: data('+k+') type undefined.');
            }


            const tmpDataType = tmpData.type;
            let typeType = typeof tmpDataType;

            Rule._parseOpts_enumTypes(k, tmpDataType);

            // // function check
            // if ('function' === typeType) {
            //     throw new Error('[Rule.parseOpts] err: data('+k+') type isFunction.');
            // }

            //////////////////////////////////
            // array check
            if (tmpDataType instanceof Array) {
                // 限定，有1个类型，且该类型不为数组
                if (tmpDataType.length !== 1 || tmpDataType[0] instanceof Array) {
                    throw new Error('[Rule.parseOpts] err: data('+k+') type isArray invalid.');
                }
                // 检测子项
                let res = this._parseOpts_typeCheckDo(k, tmpDataType[0], tmpData, 2);
                let res2 = {};
                if (tmpDataType[0] instanceof Object) {
                    res2.typeExt = res;
                } else {
                    res2 = res;
                    res2.typeExt = res.type;
                }
                res2.type = 'array';
                res2.default = [];
                // console.dir(res2);
                this._rules[k] = res2; // 有可能object
                continue;
            }

            ///////////////////////////////////
            // // base type check
            // if (!RuleDataType[tmpDataType] && !RuleDataType[typeType]) {
            //     throw new Error('[Rule.parseOpts] err: data('+k+') type invalid.');
            // }

            ///////////////////////////////////
            // object
            if ('object' === typeType) {
                // 空值检测
                if (Object.keys(tmpDataType).length === 0) {
                    throw new Error('[Rule.parseOpts] err: data('+k+') type isObject && empty.');
                }
                this._rules[k] = {
                    type: 'object',
                    typeExt: {},
                    default: {}
                };
                // 检测子项
                for (let k2 in tmpDataType) {
                    if (undefined === tmpDataType[k2].type) {
                        throw new Error('[Rule.parseOpts] err: data('+k+'.'+k2+') type isObject && type undefined.');
                    }
                    this._rules[k]['typeExt'][k2] = this._parseOpts_typeCheckDo(k+'.'+k2, tmpDataType[k2].type, tmpData[k2], 2);// 有可能object,array
                    // console.log(k, k2, this._rules[k][k2]);
                }
                continue;
            }
            //--> tmpData.type类型检测
            this._rules[k] = this._parseOpts_typeCheckDo(k, tmpDataType, tmpData);

            //索引:
            // 仅支持简单类型
            // 仅根结点
            // 不做object,array的索引
            if ('_id' === k) {
                this._indexes[k] = {index: 'unique'};
            } else {
                this._indexes[k] = Rule._parseOpts_IndexCheckAndGet(k, tmpData);
            }
        }
    }

    // 遍历RuleDataType，确认type是否存在(7种数据类型)
    static _parseOpts_enumTypes(k, tmpType) {
        let exists = false;
        for (let i = 0, len = RuleDataType.length; i < len; ++i) {
            if (tmpType === RuleDataType[i] ||
                (typeof tmpType !== 'function' && tmpType instanceof RuleDataType[i]) // 检测自定对象,数组
            ) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            throw new Error('[Rule.parseOpts] err: data('+k+') type invalid.');
        }
    }

    // deep：用于递归时，限制递归深度, 从1开始
    // dataType:
    //    string,number,boolean,date,ObjectId,object, array
    _parseOpts_typeCheckDo(k, dataType, data, deep) {
        // console.log('_parseOpts_typeCheckDo:', k);
        if (undefined === deep) {
            deep = 1;
        } else if (deep > RuleDeepLimit) { // 深度检测
            throw new Error('[Rule.parseOpts] err: data type(' + k + ') DeepLimit:' + RuleDeepLimit+'.');
        }

        //<-- 类型检测
        Rule._parseOpts_enumTypes(k, dataType);
        const tpType = typeof dataType;
        // if ('function' === tpType) {
        //     throw new Error('[Rule.parseOpts] err: data('+k+') type isFunction.');
        // }

        // array
        if (dataType instanceof Array) {
            // 限定，有1个类型，且该类型不为数组
            if (dataType.length !== 1 || dataType[0] instanceof Array) {
                throw new Error('[Rule.parseOpts] err: data('+k+') type isArray invalid.');
            }

            // 检测子项
            let res = this._parseOpts_typeCheckDo(k, dataType[0], '', deep + 1); // 有可能object
            // console.dir('11', k, res);

            let res2 = {};
            if (dataType[0] instanceof Object) {
                res2.typeExt = res;
            } else {
                res2 = res;
                res2.typeExt = res.type;
            }
            res2.type = 'array';
            res2.default = [];
            // console.dir(res2);
            // this._rules[k] = res2; // 有可能object
            return res2;
        }

        // // base type check
        // if (!RuleDataType[dataType] && (!(RuleDataType[tpType] && 'string' !== tpType))) {
        //     throw new Error('[Rule.parseOpts] err: data('+k+') type('+dataType+') invalid.');
        // }

        // object
        // {type: 'date'}
        if ('object' === tpType) {
            // 空值检测
            if (Object.keys(dataType).length === 0) {
                throw new Error('[Rule.parseOpts] err: data('+k+') type isObject && empty.');
            }
            let res = {
                type: 'object',
                typeExt: {},
                default: {}
            };
            // 检测子项
            for (let k2 in dataType) {
                if (undefined === dataType[k2].type) {
                    throw new Error('[Rule.parseOpts] err: data('+k+'.'+k2+') type isObject && type undefined.');
                }
                res['typeExt'][k2] = this._parseOpts_typeCheckDo(k+'.'+k2, dataType[k2].type, dataType[k2], deep + 1);// 有可能object,array
                // console.log('===', k2, res[k2]);
            }
            return res;
        }
        //--> 类型检测

        // base
        let tp = Rule._parseOpts_getTypeStr(dataType);
        let defaultVal = Rule._parseOpts_DefaultCheckAndGet(k, dataType, data);

        // _id自动默认值
        if ('_id' == k || (1 === deep && undefined !== data.default)) {
            if (defaultVal instanceof Function) {
                this._defaultsFunc[k] = defaultVal;
                this._defaultsFuncExists = true;
            } else {
                this._defaults[k] = defaultVal;
                this._defaultsExists = true;
            }
        }
        return {
            type: tp,
            default: defaultVal
        };
    }
    // 将nodejs类型转为字串标识
    static _parseOpts_getTypeStr(dataType) {
        switch (dataType) {
        case String: {
            return 'string';
        }
        case Number: {
            return 'number';
        }
        case Boolean: {// true || false
            return 'boolean';
        }
        case Date: { // Date || Date.now
            return 'date';
        }
        case ObjectId: {// ObjectId
            return 'ObjectId';
        }
        default: {
            if (dataType instanceof Array) {
                return 'array';
            }
            if (dataType instanceof Object) {
                return 'object';
            }
        }
        }//switch(tmpData.type)
        return 'undefined';// should not run here;
    }


    // 索引：无显式设定，全部false
    // return: {index:'hashed', uinque: false}
    // mongodb不支持：hashed索引为unique
    static _parseOpts_IndexCheckAndGet(k, dataType) {
        if (!!dataType.index) {
            switch (dataType.index) {
            case true: {
                return {index: 1};
            }
            case 'hashed': {
                return {index: 'hashed'};
            }
            case 'unique': {
                return {index:1 ,unique: true};
            }
            default: {
                break;
            }
            }
        }
        return false;
    }

    // 默认值: 取默认值
    // 未显式定义，设定相应默论值
    // object默认值{},array默认值[]
    static _parseOpts_DefaultCheckAndGet(k, dataType, tmpData) {
        if (undefined === tmpData || undefined === tmpData.default) {
            switch (dataType) {
            case String: {
                return '';
            }
            case Number: {
                return 0;
            }
            case Boolean: {// true || false
                return false;
            }
            case Date: { // Date || Date.now
                return Date;
            }
            case ObjectId: {// ObjectId
                return ObjectId;
            }
            // case 'object': { // 在之前会处理设置
            //     return {};
            // }
            default: {
                if (tmpData.type instanceof Array && 0 !== tmpData.type.length) {
                    return [];
                }
                if (tmpData.type instanceof Object && 0 !== Object.keys(tmpData.type).length) {
                    return {};
                }
                const errorStr = '[Rule.parseOpts] _parseOpts_DefaultCheckAndGet err: data(' + k + ') type.default value(' + tmpData.type + ') invalid.';
                throw new Error(errorStr);
            }
            }//switch(tmpData.type)
        }
        const defaultType = typeof tmpData.default;
        const errorStr = '[Rule.parseOpts] err: data(' + k + ',' + dataType + ') type.default value(' + tmpData.default + ',' + defaultType + ') invalid.';
        switch (dataType) {
        case String: {
            if (k == '_id' && 'function' == defaultType) {
                break;
            }
            if ('string' !== defaultType) {
                throw new Error(errorStr);
            }
            break;
        }
        case Number: {
            if ('number' !== defaultType) {
                throw new Error(errorStr);
            }
            break;
        }
        case Boolean: {// true || false
            if ('boolean' !== defaultType) {
                throw new Error(errorStr);
            }
            break;
        }
        case Date: { // Date || Date.now
            return Date;
            // if (!(tmpData.default === Date/* || tmpData.default === Date.now*/)) {
            //     throw new Error(errorStr);
            // }
            // break;
        }
        case ObjectId: {// ObjectId
            return ObjectId;
            // if (tmpData.default !== ObjectId) {
            //     throw new Error(errorStr);
            // }
            // break;
        }
        default: {
            if (tmpData.type instanceof Array && 0 !== tmpData.type.length) {
                break;
            }
            if (tmpData.type instanceof Object && 0 !== Object.keys(tmpData.type).length) {
                break;
            }
            throw new Error(errorStr);
        }
        }//switch(tmpData.type)
        return tmpData.default;
    }
}

module.exports = (...args) => {
    return new Rule(...args);
};