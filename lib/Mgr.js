/**
 * Created by Linqy on 2018\6\28 0027.
 */

/*
* 命名，遵守驼峰法
* 首字母大写，表示对外
* */
//singleton
const MgrImpl = require('./MgrImpl');


let _Mgr;
let _Isinited = false;

const pro = module.exports = {};

// pro.CreateMgr = function(opts) {
//     if (undefined === _Mgr) {
//         _Mgr = MgrImpl(opts);
//         _Isinited = true;
//     }
//     return _Mgr;
// };
const Instance = pro.Instance = (...args) => {
    if (undefined === _Mgr) {
        _Mgr = MgrImpl(...args);
        _Isinited = true;
    }
    return _Mgr;
};

pro.Load = function(...args) {
    // if (!_Isinited) {
    //     throw new Error('[MgrImpl] not inited.');
    // }
    return Instance().Load(...args);
};