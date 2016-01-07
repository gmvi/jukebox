var _       = require('lodash'),
    winston = require('winston');

var knex = require('knex')(global.config.db);
var bookshelf = require('bookshelf')(knex);

var utils = require('./utils');

exports.initialize = function(cb) {
  return knex.schema.createTable('rooms', function (table) {
    table.increments();
    table.string('name').defaultTo('Unnamed Room');
    table.string('key').notNullable();
    table.string('pathtoken').unique();
    table.string('peer').unique();
  }).then(cb||function(){});
}

var Room = exports.Room = bookshelf.Model.extend({
  tableName: 'rooms',
  serializePublic: function() {
    return this.pick(['id', 'name', 'pathtoken', 'peer']);
  },
  serializePrivate: function() {
    var json = this.pick(['id', 'name', 'key', 'pathtoken', 'peer']);
    return json;
  }
}, {
  validatePathtoken: function(token) {
    return new Promise(function(fulfill, reject) {
      var sanitized = utils.sanitizePathtoken(token);
      if (token !== sanitized) {
        reject(new Error('invalid'));
      } else if (utils.reservedTokens.indexOf(token) >= 0) {
        reject(new Error('duplicate'));
      } else {
        fulfill();
      }
    });
  }
});
