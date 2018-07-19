
结构示意图：
//////////////////////////////////////////////////////////////
Mgr-MgrImpl:
    -State:状态集
        -Uninited
        -Inited
        -Start
        -Error:事件类
        -Stop
    -Event:事件类
        -db连接
            -close
            -reconnect
            -reconnectFail
            -parsed error
        -类型检测
    -DbMap(Db from DbFactory):连接抽象类管理
    -DbCocMap(Coc from Db.Coc):表缓存
    -rDataMap(real data map):真实数据map{dbname/cocname:{_id:data}}
    -DataMap(Data from DataFactory): 数据抽象类
    -RuleMap:规则抽象类
    -SDataMap:各表Data数据抽象类

//////////////////////////////////////////////////////////////
Db:连接抽象类
    -constructor or Init
        -MongoClient::connect
    -dbname
    -db:真实连接
    -Close
    -Coc

//////////////////////////////////////////////////////////////
Data:数据抽象类
    -返回给外部，用于操作数据
    -Save:触发Icoc
    -Page:触发Icoc
    -getter:触发IRData
    -setter:触发IRData
    -key(dbname,cocname)
    -changedArr:
        -记录改变的根结点

//////////////////////////////////////////////////////////////
RuleMap:规则抽象类
    -将各table设定的规则，转为相应接口
    -Init
