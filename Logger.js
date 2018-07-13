/**
 * Created by Linqy on 2018\7\12 0012.
 */
const logger = {
    TRACE: console.log,//一般显示
    DEBUG: console.log,// 用于调错的打印-调试
    INFO: console.log, // 用于生产打印- 某些必要信息打印（系统状态、匹配状态）
    WARN: console.log,// 发生逻辑错误-影响一条业务
    ERROR: console.log,// 严重到需立即查明问题的情况-影响整个程序
};
// const logger = {
//     TRACE: ()=>{},
//     DEBUG: ()=>{},
//     INFO: console.log, // 用于生产打印- 某些必要信息打印（系统状态、匹配状态）
//     WARN: console.log,// 发生逻辑错误-影响一条业务
//     ERROR: console.log,// 严重到需立即查明问题的情况-影响整个程序
// };
module.exports = logger;