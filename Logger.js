/**
 * Created by Linqy on 2018\7\12 0012.
 */
let logger = {
    trace: console.log,//一般显示
    debug: console.log,// 用于调错的打印-调试
    info: console.log, // 用于生产打印- 某些必要信息打印（系统状态、匹配状态）
    warn: console.log,// 发生逻辑错误-影响一条业务
    error: console.log,// 严重到需立即查明问题的情况-影响整个程序
};
logger = {
    trace: ()=>{},
    debug: ()=>{},
    info: console.log, // 用于生产打印- 某些必要信息打印（系统状态、匹配状态）
    warn: console.log,// 发生逻辑错误-影响一条业务
    error: console.log,// 严重到需立即查明问题的情况-影响整个程序
};
module.exports = logger;