/**
 * Created by Linqy on 2018\6\28 0027.
 * mongodb@2.2.35, mongodb-core@2.1.19
 */
'use strict';

/*
* 命名，遵守驼峰法
* 首字母大写，表示对外
* */
const logger = console.log;
//singleton
const MgrImpl = require('./MgrImpl');


let _Mgr;
let _Isinited = false;

const pro = module.exports = {};

pro.CreateMgr = function(opts) {
    if (undefined === _Mgr) {
        _Mgr = MgrImpl(opts);
        _Isinited = true;
    }
    return _Mgr;
};

pro.Load = function([dbName, cocName, rule]) {
    if (!_Isinited) {
        throw new Error('[MgrImpl] not inited.');
        // logger("[MgrImpl] not inited.")
        // return;
    }
    return _Mgr.Load([dbName, cocName, rule]);
};