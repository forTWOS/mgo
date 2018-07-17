/**
 * Created by Linqy on 2018\7\14 0014.
 */
const G_MgrImpl = global.MgrImpl;
const pro = module.exports = {};

pro.GetCoc = (key) => {
    return G_MgrImpl._mgr.GetDbCoc(key);
};
pro.GetRule = (key) => {
    return G_MgrImpl._mgr.GetRule(key);
};
pro.GetRData = (key, id) => {
    return G_MgrImpl._mgr.GetRData(key, id);
};
pro.GetLogger = () => {
    return G_MgrImpl._mgr.logger;
};
pro.GetDefaultDbName = () => {
    return G_MgrImpl._mgr.__defaultDbName;
};