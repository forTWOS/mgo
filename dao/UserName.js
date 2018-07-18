/**
 * Created by Linqy on 2018\7\18 0018.
 */

const mgo = require('./mgo');

const UserNameRule = {
    tableName: 'user_name',
    data: {
        _id: {type: String, default: mgo.IdString },
        name: { type: String, default: ''}
    }
};

const coc = mgo.Load(['', UserNameRule]);

module.exports = coc;