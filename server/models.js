var _       = require('lodash'),
    winston = require('winston');

var knex = require('knex')(global.config.db);
var bookshelf = require('bookshelf')(knex);

var util = require('./util');

exports.initialize = function() {
  return knex.schema.createTable('rooms', function (table) {
    table.increments();
    table.string('name').defaultTo('Unnamed Room');
    table.string('key').notNullable();
    table.string('uri_token').unique();
    table.string('peer').unique();
  }).then(function(){});
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
  sanitizeURIToken: function(token) {
    return new Promise(function(fulfill, reject) {
      if (_.isString(token) && token.length != 0) {
        token = token.replace(/[']/gi, '')
                     .replace(/[^\w\.~]/gi, '-')
                     .toLowerCase();
        if (util.reservedTokens.indexOf(token) >= 0) {
          reject(new Error('duplicate'));
        }
        fulfill(token);
      } else {
        fulfill(null);
      }
    });
  }
});
