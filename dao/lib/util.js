/**
 * Created by Linqy on 2018\7\14 0014.
 */
const GMgrImpl = global.MgrImpl;
const pro = module.exports = {};

pro.GetCoc = (key) => {
    return GMgrImpl._mgr.GetDbCoc(key);
};
pro.GetRule = (key) => {
    return GMgrImpl._mgr.GetRule(key);
};
pro.GetRData = (key, id) => {
    return GMgrImpl._mgr.GetRData(key, id);
};
pro.GetLogger = () => {
    return GMgrImpl._mgr.logger;
};
pro.GetDefaultDbName = () => {
    return GMgrImpl._mgr.__defaultDbName;
};