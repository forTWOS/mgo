/**
 * Created by Linqy on 2018\6\29 0029.
 */
module.exports = {
    Ok: 0,
    Fail: 1,
    ParamsErr: 2,
    DbCoc: {
        DbErr: 101,
        CocNotExists: 102,
        DbProcessErr: 103,
        CreateDataError: 104,
    },
    Data: {
        Saving: 201,
        DataNotExists:202,
        SaveError: 203,
        RuleCheckFailed: 204,
        PathInvalid: 205,
    }
};