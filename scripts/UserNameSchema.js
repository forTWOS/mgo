/**
 * Created by Linqy on 2018\7\18 0018.
 */

const mgo = require('..');

const UserNameRule = {
    tableName: 'user_name',
    data: {
        _id: {type: String, default: mgo.IdString },
        name: { type: String, default: ''}
    }
};
const methods = UserNameRule.methods = {};
methods.G_name = function() {
    return this.name;
};

const coc = mgo.Load(['', UserNameRule]);

module.exports = coc;