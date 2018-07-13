/**
 * Created by Linqy on 2018\6\28 0027.
 * require关系: Mgr->MgrImpl->Data(先执行完，再返回，此中，如果require('./MgrImpl')===MgrImpl=={})
 * 所以：此文件中MgrImpl.Instance，需在MgrImpl完成后，再取值
 */
const ErrCode = require('./ErrCode');
const logger = require('../../Logger');
const G_MgrImpl = global.MgrImpl;

const GetCoc = (key) => {
    return G_MgrImpl._mgr.GetDbCoc(key);
};
const GetRule = (key) => {
    return G_MgrImpl._mgr.GetRule(key);
};

const LastErrorTimeLimit = 10000;

class Data{
    constructor([dbName, cocName], id, idObj) {
        this.__dbName = dbName;
        this.__cocName = cocName;
        this.__key = this.__dbName+'/'+this.__cocName;
        this.__id = id;
        this.__idObj = idObj;

        this.__changedRoot = {}; // 初始化改变列表
        this.__changedRootExists = false; // 标志：仅为运算方便
        this.__changedRoot_ing = undefined; //在进行中的改变列表
        this.__isStop = false;//是否进行Data清理<<流程>>，归Data.Stop和DbCoc.Load修改
        this.__isCreated = false;//是否为新建数据
        this.__lastErrorTime = 0;//在db层操作返回错误后，记录时间，用于缓冲一段时间再操作
    }

    // 清理真实数据接口
    // MgrImpl:
    // 1.__DataMap
    // 2.__rDataMap
    // ps: 调用此接口后，业务层保存的data需要移除
    Stop() {
        if (this.IsStop()) {// 正常业务，不会触发多次stop；db异常有可能会
            return;
        }
        if (!this.IsChanged() && !this.IsCreated() && !this.isSaving()) {
            logger.DEBUG('[Data.Stop] clear Data:', this.__id);// todo:重要处理，打印一下
            G_MgrImpl._mgr.RemoveData(this.__key, this.__id);
            return;
        }
        this.Save();
        this.SetStop(true);
    }

    IsStop() {
        return this.__isStop;
    }
    SetStop(flag) {
        this.__isStop = flag;
    }
    IsCreated() {
        return this.__isCreated;
    }
    IsChanged() {
        return this.__changedRootExists;
    }
    isSaving() {
        return undefined !== this.__changedRoot_ing;
    }
    setLastErrorTime() {
        this.__lastErrorTime = Date.now() + LastErrorTimeLimit-1000;//时间错开，防止Save处过滤掉该次Save
        this.__lastErrorT = setTimeout(() => {
            this.Save();
            this.__lastErrorT = undefined;
        }, LastErrorTimeLimit);
    }

    // 清理标志
    clearChangedRoot() {
        // this.__isCreated = false;
        this.__changedRoot = {};
        this.__changedRootExists = false;
    }
    // 说明：
    // 主动调用，通知改变了什么路径
    // 非根结点，不触发setter，用此辅助
    // path:
    //    1. gold
    //    2. face.front
    SetChange(path) {
        logger.DEBUG('[Data.SetChange]  id('+this.__id+'), begin: ', path);
        let tmp_path = this.parsePath(path);
        let rootKey = tmp_path[0];
        if (0 == tmp_path.length /*|| '_id' == rootKey*/ || 'string' != typeof rootKey/* || undefined === this[rootKey]*/) {//空值或_id(不可变)或非string
            logger.WARN('[Data.SetChange] err: id('+this.__id+'), path('+path+') invalid.');
            return ErrCode.Data.PathInvalid;
        }

        if (!GetRule(this.__key).CheckPath(rootKey, this[rootKey])) {
            logger.WARN('[Data.SetChange] err: id('+this.__id+'), path('+path+') data check failed.');
            return ErrCode.Data.RuleCheckFailed;
        }
        // if (undefined === srules..GetRules()[tmp_path[0]]) {
        //     return '[Data.Set] err: id('+this.__id+'), path('+path+') rule undefined.';
        // }
        this.__changedRoot[rootKey] = 1; // 初始化改为列表
        this.__changedRootExists = true; // 标志：仅为运算方便
        logger.DEBUG('[Data.SetChange] succ: id('+this.__id+'), ', path);
        return ErrCode.Ok;
    }
    // 因为是消息处理，不使用cb等待
    // 下层保证数据不丢失(事件方案)
    Save() {
        logger.DEBUG('[Data.Save] begin', this.__id);
        if (this.__lastErrorTime > Date.now()) {//错误后10秒内，不进行操作
            return;
        }
        //无改变则不处理
        //操作正在进行中,等操作结束，进行触发
        if ((!this.IsChanged() && !this.IsCreated()) || this.isSaving()) {
            logger.DEBUG('[Data.Save] id, !IsChanged || isSaving || !IsCreated', this.__id, !this.IsChanged(), this.isSaving(), !this.IsCreated());
            return;
        }

        if (GetCoc(this.__key).HadSaveMsg(this.__id)) {
            return;
        }

        // todo:遍历类型检测
        let srules = GetRule(this.__key);
        // console.log(srules.GetRules());

        GetCoc(this.__key).AddSaveMsg(this.__id);
    }
    DoSave(cb) {
        logger.TRACE('[Data.DoSave] begin.');
        if (this.IsCreated()) {
            this.__isCreated = false;
            this.clearChangedRoot();
            this.doCreate(cb);
            return;
        }

        if (!this.IsChanged()) {
            logger.WARN('[Data.Save] key('+this.__key+'.'+this.__id+') data empty.');
            if (undefined !== cb) {
                cb(ErrCode.Ok);
            }
            return;
        }

        //取真实数据
        let data = G_MgrImpl._mgr.GetRData(this.__key, this.__id);
        if (undefined === data) {
            logger.ERROR('[Data.Save] key('+this.__key+'.'+this.__id+') data undefined.');
            if (undefined !== cb) {
                cb(ErrCode.Data.DataNotExists);
            }
            return;
        }

        //取改变值
        let sets = {};
        for (let k in this.__changedRoot) {
            if (undefined === data[k]) {
                logger.TRACE('[Data.Save] key('+k+') is undefined.');
                continue;
            }
            sets[k] = data[k];
        }
        // 备份当前保存root点
        this.__changedRoot_ing = this.__changedRoot;
        logger.TRACE('[Data.DoSave] ', this.__changedRoot_ing);

        // 清理标志
        this.clearChangedRoot();

        GetCoc(this.__key).Save(this.__idObj, sets, (err) => {
            logger.DEBUG('[Data.DoSave] result:', this.__id, err);
            if (err) { // 存储失败，将改root还给__changeRoot
                for (let k in this.__changedRoot_ing) {
                    this.__changedRoot[k] = this.__changedRoot_ing[k];
                }
                this.setLastErrorTime();
            }
            this.__changedRoot_ing = undefined;
            if (undefined !== cb) {
                cb(err ? ErrCode.Data.SaveError: ErrCode.Ok, err);
            }
        });
    }
    SaveForce(cb) { //强制保存所有数据
        GetCoc(this.__key).SaveForce(this.__idObj, (err) => {
            logger.DEBUG('[Data.SaveForce] :', this.__id, err);
            if (err) {
                this.setLastErrorTime();
            }
            if (undefined !== cb) {
                cb(err ? ErrCode.Data.SaveError: ErrCode.Ok, err);
            }
        });
    }
    doCreate(cb) { //强制保存所有数据
        logger.TRACE('[Data.doCreate] begin.');
        this.__changedRoot_ing = true;
        GetCoc(this.__key).doCreate(this.__idObj, (err) => {
            logger.DEBUG('[Data.doCreate] result :', this.__id, err);
            if (err) { // 存储失败，将改root还给__changeRoot
                this.__isCreated = true;
                this.setLastErrorTime();
            } else {
                this.__isCreated = false;
            }
            this.__changedRoot_ing = undefined;
            if (undefined !== cb) {
                cb(err ? ErrCode.Data.SaveError: ErrCode.Ok, err);
            }
        });
    }


    // 以.作分隔符
    parsePath(path) {
        // path must be string
        if (typeof path != 'string') {
            return [];
        }
        let ind = path.indexOf('.');
        if (-1 == ind) { //根结点
            return [path];
        }
        const res = [];
        let cur_ind = 0;
        for (;cur_ind < path.length;) {
            let ind = path.indexOf('.', cur_ind);
            if (-1 == ind) {
                res.push(path.substring(cur_ind));
                break;
            }
            res.push(path.substring(cur_ind, ind));
            cur_ind = ind+1;
        }
        return res;
    }
    // // path:
    // //    1. gold
    // //    2. face.front
    // Set(path, val) {
    //    let tmp_path = this.parsePath(path);
    //    if (0 == tmp_path.length) {
    //        return '[Data.Set] err: path('+path+') invalid';
    //    }
    //    this.__changedRoot[tmp_path[0]] = 1;
    // }
}

// module.exports = (...args) => {
//     return new Data(...args);
// };
module.exports = Data;