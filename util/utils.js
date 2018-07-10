/**
 * Created by Linqy on 2018\7\9 0009.
 */
const IntMax = 0x7FFFFFFF;

const utils = module.exports = {};

// 取整运算
utils.GetInt = (f) => {
    return (f > IntMax) ? parseInt(f) : ~~f;
};