/**
 * Export lib/mgo
 *
 */

'use strict';

const mgo = require('./lib/');

module.exports = mgo;
module.exports.default = mgo;
module.exports.mgo = mgo;

// Re-export for ESM support
module.exports.initMgo = mgo.initMgo;
module.exports.S_Rule = mgo.S_Rule;
module.exports.Load = mgo.Load;
module.exports.IdString = mgo.IdString;
module.exports.ObjectId = mgo.ObjectId;