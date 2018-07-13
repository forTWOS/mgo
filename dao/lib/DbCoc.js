/**
 * Created by Linqy on 2018\6\28 0027.
 * mongodb原生coc表接口的封装，用于做相关数据操作:表处理、数据封装
 * 1个表==1个DbCoc
 */
const mongodb = require('mongodb'),
    ObjectId = mongodb.ObjectId;
const logger = require('../../Logger');

const ErrCode = require('./ErrCode');

const G_MgrImpl = global.MgrImpl;

module.exports = (...args) => {
    return new DbCoc(...args);
};

// 约有52个DbCoc
// statistic服4个
// auth服3个
// userstate服45个
// 防止腾讯mongodb传输限制，设小值
const DbCoc_saveLimit = 20;// 1DbCoc, 20人/100ms==200人/秒

// CRUD操作
class DbCoc {
    constructor([dbName, cocName]) {
        this.__dbName = dbName;
        this.__cocName = cocName;
        this.__key = this.__dbName + '/' + this.__cocName;
        this._coc = undefined;

        //msg
        this.__saveMsgCount = 0;//计数
        this.__saveMsgMap = {};//保存消息队列
        this.__saveMsgMap_ing = false;//进行中标志

        //debug
        this.__statePrintTime = 0; // State输出间隔
    }
    State(now) {
        if (this.__statePrintTime + 10000 > now) {
            return;
        }
        this.__statePrintTime = now;
        logger.INFO('[DbCoc.State] __key:' + this.__key + ', __saveMsgCount:' + this.__saveMsgCount + ', __saveMsgMap:' + Object.keys(this.__saveMsgMap).length);
    }

    // 100ms/次
    Tick(now) {
        this.State(now);
        // return this.TickSaveMsg(now, saveLimit);
    }

    // Purpose:通过obj，自动存库处理
    // 操作:
    // 1.创建内存Data-对传入obj做过滤
    // 2.将数据保存到mongodb库中
    Create(obj, cb) {
        let data = G_MgrImpl._mgr.CreateData([this.__dbName, this.__cocName], obj);
        if (null === data) {
            logger.WARN('[DbCoc.Create] err: Data('+this.__dbName+','+this.__cocName+') undefined.');
            cb(ErrCode.DbCoc.CreateDataError);
            return;
        }
        // logger.TRACE(data);
        data.Save();
        // this.Insert(obj, cb);
        cb(ErrCode.Ok, data);
    }
    // 通过id，去mongodb库加载数据，并返回Data封装
    // 此处返回的接口，用于各业务模块数据操作
    Load(id, cb) {
        let sdata = G_MgrImpl._mgr.GetData(this.__key, id);
        // logger.TRACE('[DbCoc.Load] sdata:', this.__key, id, sdata);
        if (undefined !== sdata) {
            // 此处目标: 中断Data.Stop流程
            // 检测Data是否在走Data.Stop流程
            // 有则移除,换成Data.Save流程
            // ps:
            //   1.DbCoc.Load和Data.Stop,两操作之间，有10分钟间隔期
            //   2.为防在Data.Stop流程进行中，新增一个处理中队列__stopMsgMap_ing, 进行DbCoc.Load,在update处理时，等待处理完成，再移除DbCoc.__stopMsgMap_ing
            if (sdata.IsStop()) {
                sdata.SetStop(false);
            }

            cb(null, sdata);
            return;
        }
        this.One({_id: ObjectId(id)}, cb);// todo:异常事件处理
    }
    Page([page, pageSize], cb) {//todo
        cb();
    }
    // 保存给定的值
    Save(id, sets, cb) {
        logger.TRACE('[DbCoc.Save] begin');
        this.Update({_id: id}, {'$set': sets}, cb);
    }
    // 强制保存id下的data全值
    // 无则创建
    SaveForce(id, cb) {
        let data = G_MgrImpl._mgr.GetRData(this.__key, id);
        if (undefined === data) {
            let errStr = '[DbCoc.SaveForce] key('+this.__key+'.'+id+') data undefined.';
            logger.TRACE(errStr);
            cb(errStr);
            return;
        }
        this.Update({_id: data._id}, data, {upsert: true}, cb);
    }
    doCreate(id, cb) {
        logger.TRACE('[DbCoc.doCreate] begin.');
        let data = G_MgrImpl._mgr.GetRData(this.__key, id);
        if (undefined === data) {
            let errStr = '[DbCoc.doCreate] key('+this.__key+'.'+id+') data undefined.';
            logger.TRACE(errStr);
            cb(errStr);
            return;
        }
        this.Insert(data, cb);
    }

    ///////////////////////////////////////////
    // 取真实mongodb库的collection接口
    // 有可能空值
    getCoc() {
        if (this._coc) {
            return this._coc;
        }

        // 通过db连接，取真实mongodb库的collection接口
        let db = G_MgrImpl._mgr.GetDb(this.__dbName);
        this._coc = db.Coc(this.__cocName);

        return this._coc;
    }

    //////////////////////////////////////////////
    // Msg
    // saveLimit当次可用处理条数
    // 返回当次处理条数
    TickSaveMsg(now, saveLimit) {
        if (this.__saveMsgCount <= 0 || this.__saveMsgMap_ing) {
            return 0;
        }
        this.__saveMsgMap_ing = true;
        let ids = [];
        for (let k in this.__saveMsgMap) {
            ids.push(k);
            if (/*ids.length >= DbCoc_saveLimit ||*/ --saveLimit <= 0) {
                break;
            }
        }

        if (ids.length == 0) {//应该不会运行到
            logger.WARN('[DbCoc.TickSaveMsg] err: __saveMsgMap empty.');
            return 0;
        }

        let cn = ids.length;
        for (let i = 0; i < ids.length; ++i) {
            let id = ids[i];
            this.__saveMsgMap[id] = undefined;
            delete this.__saveMsgMap[id];
            --this.__saveMsgCount;

            // 找到Data，并调用其DoSave(异步)
            let sdata = G_MgrImpl._mgr.GetData(this.__key, id);
            sdata.DoSave((errCode) => {
                // 容错处理
                if (errCode || sdata.IsChanged() || sdata.IsCreated()) {
                    sdata.Save(); // 重走保存流程
                } else if (sdata.IsStop()) {//清理流程 有Data.isStop标志
                    logger.INFO('[DbCoc.doSave] clear Data:', id);// todo:重要处理，打印一下
                    G_MgrImpl._mgr.RemoveData(this.__key, id);
                }
                if (--cn == 0) {
                    this.__saveMsgMap_ing = false;
                }
            });
        }
        logger.TRACE('[DbCoc.TickSaveMsg] ids:' + ids.length + ', this.__saveMsgCount:'+ this.__saveMsgCount);
        return ids.length;
    }
    HadSaveMsg(id) {
        return !!this.__saveMsgMap[id];
    }
    AddSaveMsg(id) {
        if (!this.__saveMsgMap[id]) {
            this.__saveMsgMap[id] = 1;
            ++this.__saveMsgCount;
        }
    }

    // 给mongodb库的返回值，做Data封装
    addData(data) {
        return G_MgrImpl._mgr.AddData([this.__dbName, this.__cocName], data);
    }
    addDatas(datas) {
        return G_MgrImpl._mgr.AddDatas([this.__dbName, this.__cocName], datas);
    }

    ////////////////////////////////////
    // insert 插入数据
    Insert(obj, cb) {
        let coc = this.getCoc();
        if (!coc) {
            cb(ErrCode.DbCoc.CocNotExists);
            return;
        }

        // coc.insertMany(obj, cb);
        coc.insertOne(obj, (err, res) => {
            if (err /*|| !res.result.ok*/) {
                cb(err);
                return;
            }
            cb(null/*, this.addData(res.ops[0])*/);
        });
    }

    ////////////////////////////////////
    // get
    One(find, filter, opts, cb) {
        if (undefined === cb) {
            if (undefined === opts) {
                cb = filter;
                filter = {};
                opts = {};
            } else {
                cb = opts;
                opts = {};
            }
            if (undefined === cb || typeof cb !== 'function') {
                logger.WARN('[DbCoc.One] err: params invalid');
                throw new Error('[DbCoc.One] err: params invalid');
            }
        }
        this.doOne(find, filter, opts, (err, data) => {
            if (err) {
                cb(err);
                return;
            }
            if (data == null) {
                cb(null, undefined);
                return;
            }
            cb(null, this.addData(data));
        });
    }
    //返回原始数据
    OneOriginal(find, filter, opts, cb) {
        if (undefined === cb) {
            if (undefined === opts) {
                cb = filter;
                filter = {};
                opts = {};
            } else {
                cb = opts;
                opts = {};
            }
            if (undefined === cb || typeof cb !== 'function') {
                logger.WARN('[DbCoc.OneOriginal] err: params invalid');
                throw new Error('[DbCoc.OneOriginal] err: params invalid');
            }
        }
        this.doOne(find, filter, opts, (err, data) => {
            if (err) {
                cb(err);
                return;
            }
            if (data == null) {
                cb(null, undefined);
                return;
            }
            cb(null, this.addData(data));
        });
    }
    // 处理One取数据操作
    doOne(find, filter, opts, cb) {
        // if (undefined === cb) {
        //     if (undefined === opts) {
        //         cb = filter;
        //         filter = {};
        //         opts = {};
        //     } else {
        //         cb = opts;
        //         opts = {};
        //     }
        //     if (undefined === cb || typeof cb !== 'function') {
        //         logger.WARN('[DbCoc.Find] err: params invalid');
        //         throw new Error('[DbCoc.Find] err: params invalid');
        //     }
        // }
        let coc = this.getCoc();
        if (!coc) {
            cb(ErrCode.DbCoc.CocNotExists);
            return;
        }

        opts.timeout = 5000;//5秒超时
        opts.limit = 1;

        // logger.DEBUG(find, filter, opts);
        coc.find(find, filter, opts).next(cb);
    }

    ////////////////////////////////////
    // find
    Find(find, filter, opts, cb) {
        if (undefined === cb) {
            if (undefined === opts) {
                cb = filter;
                filter = {};
                opts = {};
            } else {
                cb = opts;
                opts = {};
            }
            if (undefined === cb || typeof cb !== 'function') {
                logger.WARN('[DbCoc.Find] err: params invalid');
                throw new Error('[DbCoc.Find] err: params invalid');
            }
        }

        this.doFind(find, filter, opts, (err, datas) => {
            if (err) {
                cb(err);
                return;
            }
            if (!datas || datas.length == 0) {
                cb(null, undefined);
            }

            cb(null, this.addDatas(datas));
        });
    }
    FindOriginal(find, filter, opts, cb) {
        if (undefined === cb) {
            if (undefined === opts) {
                cb = filter;
                filter = {};
                opts = {};
            } else {
                cb = opts;
                opts = {};
            }
            if (undefined === cb || typeof cb !== 'function') {
                logger.WARN('[DbCoc.FindOriginal] err: params invalid');
                throw new Error('[DbCoc.FindOriginal] err: params invalid');
            }
        }

        this.doFind(find, filter, opts, (err, datas) => {
            if (err) {
                cb(err);
                return;
            }
            if (!datas || datas.length == 0) {
                cb(null, undefined);
            }

            cb(null, this.addDatas(datas));
        });
    }
    doFind(find, filter, opts, cb) {
        // if (undefined === cb) {
        //     if (undefined === opts) {
        //         cb = filter;
        //         filter = {};
        //     } else {
        //         cb = opts;
        //         opts = {};
        //     }
        //     if (undefined === cb || typeof cb !== 'function') {
        //         cb('[DbCoc.Find] err: params invalid');
        //         return;
        //     }
        // }
        let coc = this.getCoc();
        if (!coc) {
            cb(ErrCode.DbCoc.CocNotExists);
            return;
        }

        opts.timeout = 5000;//5秒超时

        /*
         var testForFields = {
            limit: 1, sort: 1, fields:1, skip: 1, hint: 1, explain: 1, snapshot: 1, timeout: 1, tailable: 1, tailableRetryInterval: 1
          , numberOfRetries: 1, awaitdata: 1, awaitData: 1, exhaust: 1, batchSize: 1, returnKey: 1, maxScan: 1, min: 1, max: 1, showDiskLoc: 1
          , comment: 1, raw: 1, readPreference: 1, partial: 1, read: 1, dbName: 1, oplogReplay: 1, connection: 1, maxTimeMS: 1, transforms: 1
          , collation: 1
          , noCursorTimeout: 1
        }
        * */
        coc.find(find, filter, opts).toArray(cb);
    }

    ////////////////////////////////////
    // update
    Update(find, set, opts, cb) {
        if (undefined === find || undefined === set) {
            logger.WARN('[DbCoc.Update] err: params invalid.');
            cb(ErrCode.ParamsErr);
            return;
        }
        if (undefined === cb) {
            if (typeof opts === 'function') {
                cb = opts;
                opts = {};
            }
            if (undefined === cb) {
                cb(ErrCode.ParamsErr);
                return;
            }
        }

        let coc = this.getCoc();
        if (!coc) {
            cb(ErrCode.DbCoc.CocNotExists);
            return;
        }

        coc.updateOne(find, set, opts, (err, res) => {
            // res: {
            // result: { n: 1, nModified: 1, ok: 1 },
            // modifiedCount: 1,
            // upsertedId: null,
            // upsertedCount: 0,
            // matchedCount: 1 }
            if (err) {
                console.log('update err:' + err.toString());
                cb(err);
                return;
            }
            if (!res.result.ok || (res.matchedCount != 1 && res.upsertedCount != 1)) {
                logger.WARN('update err:' + res+', res.matchedCount:'+res.matchedCount+',res.upsertedCount:'+res.upsertedCount);
                cb(ErrCode.DbCoc.DbProcessErr);
                return;
            }
            // logger.TRACE(res);
            cb(null);
        });
    }
    ////////////////////////////////////
    // remove 暂无此操作，不实现了
    Remove(find, cb) {//todo

    }
}