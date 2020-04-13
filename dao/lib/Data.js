/**
 * Created by Linqy on 2018\6\28 0027.
 * require关系: Mgr->MgrImpl->Data(先执行完，再返回，此中，如果require('./MgrImpl')===MgrImpl=={})
 * 所以：此文件中MgrImpl.Instance，需在MgrImpl完成后，再取值
 */
const ErrCode = require('./ErrCode');
const GMgrImpl = global.MgrImpl;
const util = require('./util');

const LastErrorTimeLimit = 10000;

class Data{
    constructor([dbName, cocName], id, idObj) {
        this.__dbName = dbName;
        this.__cocName = cocName;
        this.__key = this.__dbName+'/'+this.__cocName;
        this.__id = id;
        this.__idObj = idObj;

        this.__changedRoot = new Set(); // 初始化改变列表
        this.__changedRooting = new Set(); //在进行中的改变列表
        this.__flagIsSaving = false;
        this.__isStop = false;//是否进行Data清理<<流程>>，归Data.Stop和DbCoc.Load修改
        this.__isCreated = false;//是否为新建数据
        this.__lastErrorTime = 0;//在db层操作返回错误后，记录时间，用于缓冲一段时间再操作
    }

    // 清理真实数据接口
    // MgrImpl:
    // 1.__DataMap
    // 2.__rDataMap
    // ps: 调用此接口后，业务层保存的data需要移除
    __Stop() {
        if (this.__IsStop()) {// 正常业务，不会触发多次stop；db异常有可能会
            return;
        }
        if (!this.__IsChanged() && !this.__IsCreated() && !this.__isSaving()) {
            util.GetLogger().info('[Data.__Stop] key[%s] clear Data:%s', this.__key, this.__id);// 重要处理，打印一下
            GMgrImpl._mgr.RemoveData(this.__key, this.__id);
            return;
        }
        this.__Save();
        this.__SetStop(true);
    }

    __IsStop() {
        return this.__isStop;
    }
    __SetStop(flag) {
        this.__isStop = flag;
    }
    __IsCreated() {
        return this.__isCreated;
    }
    __IsChanged() {
        return this.__changedRoot.size > 0;
    }
    __isSaving() {
        return this.__flagIsSaving;
    }
    __setLastErrorTime() {
        if (this.__lastErrorT) {
            return;
        }
        this.__lastErrorTime = Date.now() + LastErrorTimeLimit-1000;//时间错开，防止__Save处过滤掉该次__Save
        this.__lastErrorT = setTimeout(() => {
            this.__Save();
            this.__lastErrorT = undefined;
        }, LastErrorTimeLimit);
    }

    // 清理标志
    __clearChangedRoot() {
        // this.__isCreated = false;
        this.__changedRoot.clear();
    }
    // 说明：
    // 主动调用，通知改变了什么路径
    // 非根结点，不触发setter，用此辅助
    // path:
    //    1. gold
    //    2. face.front
    __SetChange(path) {
        util.GetLogger().debug('[Data.__SetChange]  id('+this.__id+'), begin: '+ path);
        let tmpPath = this.__parsePath(path);
        let rootKey = tmpPath[0];
        if (0 == tmpPath.length /*|| '_id' == rootKey*/ || 'string' != typeof rootKey/* || undefined === this[rootKey]*/) {//空值或_id(不可变)或非string
            util.GetLogger().warn('[Data.__SetChange] err: id('+this.__id+'), path('+path+') invalid.');
            return ErrCode.Data.PathInvalid;
        }

        if (GMgrImpl._mgr.IsDebug() && !util.GetRule(this.__key).CheckPath(rootKey, this[rootKey])) {
            util.GetLogger().warn('[Data.__SetChange] err: id('+this.__id+'), path('+path+') data check failed.');
            return ErrCode.Data.RuleCheckFailed;
        }

        this.__changedRoot.add(rootKey); // 初始化改为列表
        util.GetLogger().debug('[Data.__SetChange] succ: id('+this.__id+'), ', path);
        return ErrCode.Ok;
    }
    // 因为是消息处理，不使用cb等待
    // 下层保证数据不丢失(事件方案)
    __Save() {
        util.GetLogger().debug('[Data.__Save] begin', this.__id);
        if (this.__lastErrorTime > Date.now()) {//错误后10秒内，不进行操作
            return;
        }
        //无改变则不处理
        //操作正在进行中,等操作结束，进行触发
        if ((!this.__IsChanged() && !this.__IsCreated()) || this.__isSaving()) {
            util.GetLogger().debug('[Data.__Save] id[%s], !__IsChanged[%d] || !__IsCreated[%d] || __isSaving[%d]', this.__id, !this.__IsChanged(), !this.__IsCreated(), this.__isSaving());
            return;
        }

        if (util.GetCoc(this.__key).HadSaveMsg(this.__id)) {
            return;
        }

        util.GetCoc(this.__key).AddSaveMsg(this.__id);
    }
    __DoSave(cb) {
        util.GetLogger().trace('[Data.__DoSave] begin.');
        if (this.__IsCreated()) {
            this.__isCreated = false;
            this.__clearChangedRoot();
            this.__flagIsSaving = true;
            this.__doCreate(cb);
            return;
        }

        if (!this.__IsChanged()) {
            util.GetLogger().warn('[Data.__DoSave] key('+this.__key+'.'+this.__id+') data not changed.');
            if (undefined !== cb) {
                cb(ErrCode.Ok);
            }
            return;
        }
        this.__flagIsSaving = true;

        // 取真实数据
        let data = util.GetRData(this.__key, this.__id);
        if (undefined === data) {
            util.GetLogger().error('[Data.Save] key('+this.__key+'.'+this.__id+') data undefined.');
            if (undefined !== cb) {
                cb(ErrCode.Data.DataNotExists);
            }
            this.__flagIsSaving = false;
            return;
        }

        //取改变值
        let sets = {};
        for (let k of this.__changedRoot) {
            this.__changedRooting.add(k);// 备份当前保存root点
            if (undefined === data[k]) {
                util.GetLogger().trace('[Data.Save] key('+k+') is undefined.');
                // continue;
            }
            sets[k] = data[k];
        }

        util.GetLogger().trace('[Data.__DoSave] __changedRooting: %j', this.__changedRooting.size);

        // 清理标志
        this.__clearChangedRoot();

        util.GetCoc(this.__key).Save(this.__idObj, sets, (err) => {
            this.__flagIsSaving = false;
            util.GetLogger().debug('[Data.__DoSave] result:', this.__id, err);
            if (err) { // 存储失败，将改root还给__changeRoot
                for (let k of this.__changedRooting) {
                    this.__changedRoot.add(k);
                }
                this.__setLastErrorTime();
            }
            this.__changedRooting.clear();
            if (undefined !== cb) {
                cb(err ? ErrCode.Data.SaveError: ErrCode.Ok, err);
            }
        });
    }
    __SaveForce(cb) { //强制保存所有数据
        this.__flagIsSaving = true;
        util.GetCoc(this.__key).SaveForce(this.__idObj, (err) => {
            this.__flagIsSaving = false;
            util.GetLogger().debug('[Data.__SaveForce] :', this.__id, err);
            if (err) {
                this.__setLastErrorTime();
            }
            if (undefined !== cb) {
                cb(err ? ErrCode.Data.SaveError: ErrCode.Ok, err);
            }
        });
    }
    __doCreate(cb) { //强制保存所有数据
        util.GetLogger().trace('[Data.__doCreate] begin.');
        this.__flagIsSaving = true;
        util.GetCoc(this.__key).doCreate(this.__idObj, (err) => {//DbCoc
            this.__flagIsSaving = false;
            util.GetLogger().debug('[Data.__doCreate] result :', this.__id, err);
            if (err) { // 存储失败，将改root还给__changeRoot
                this.__isCreated = true;
                this.__setLastErrorTime();
            } else {
                this.__isCreated = false;
            }
            if (undefined !== cb) {
                cb(err ? ErrCode.Data.SaveError: ErrCode.Ok, err);
            }
        });
    }


    // 以.作分隔符
    __parsePath(path) {
        // path must be string
        if (typeof path != 'string') {
            return [];
        }
        if (-1 == path.indexOf('.')) { //根结点
            return [path];
        }
        const res = [];
        let curInd = 0;
        for (;curInd < path.length;) {
            let pind = path.indexOf('.', curInd);
            if (-1 == pind) {
                res.push(path.substring(curInd));
                break;
            }
            res.push(path.substring(curInd, pind));
            curInd = pind+1;
        }
        return res;
    }
    // // path:
    // //    1. gold
    // //    2. face.front
    // Set(path, val) {
    //    let tmp_path = this.__parsePath(path);
    //    if (0 == tmp_path.length) {
    //        return '[Data.Set] err: path('+path+') invalid';
    //    }
    //    this.__changedRoot.add(tmp_path[0]);
    // }
}

// module.exports = (...args) => {
//     return new Data(...args);
// };
module.exports = Data;