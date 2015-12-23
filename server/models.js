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
    table.string('uri_token').unique();
    table.string('peer').unique();
  }).then(cb||function(){});
}

var Room = exports.Room = bookshelf.Model.extend({
  tableName: 'rooms',
  serializePublic: function() {
    return this.pick(['name', 'uri_token', 'peer']);
  },
  serializePrivate: function() {
    var json = this.pick(['id', 'name', 'key', 'uri_token', 'peer']);
    return json;
  }
}, {
  validateURIToken: function(token) {
    return new Promise(function(fulfill, reject) {
      var sanitized = utils.sanitizePathtoken(token);
      if (token != sanitized) {
        reject(new Error('invalid'));
      } else if (utils.reservedTokens.indexOf(token) >= 0) {
        reject(new Error('duplicate'));
      } else {
        fulfill();
      }
    });
  }
});
