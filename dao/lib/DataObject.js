/**
 * Created by Linqy on 2018\7\13 0013.
 * 用于子类型为对象的封装
 */

class DataObject {
    // path 表示层级关系 [obj1][arr1]
    constructor([dbName, cocName], id, idObj, path) {
        this.__dbName = dbName;
        this.__cocName = cocName;
        this.__key = this.__dbName + '/' + this.__cocName;
        this.__id = id;
        this.__idObj = idObj;
        this.__path = path;
        this.init();
    }
    init() {

    }
}

module.exports = DataObject;