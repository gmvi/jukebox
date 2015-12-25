var _ = require('lodash');

var Enum = exports.Enum = function Enum(values) {
  // javascript getters are so awkward
  Object.defineProperty(this, 'values', { get: function() {
    // clone the array. Enums must be static.
    return values.slice(0);
  }});
  for (var i = 0; i < values.length; i++) {
    var lower = values[i].toLowerCase();
    var upper = values[i].toUpperCase();
    this[lower] = upper;
    this[upper] = upper;
  }
  this.has = function(value) {
    return value.toUpperCase() in this;
  }
}

exports.MODE = new Enum([ 'create', 'join', 'error', 'host', 'client', ]);

var reservedTokens = exports.reservedTokens = [
  'favicon.ico',
  'api',
  'peerjs',
  'css',
  'assets',
  'socket.io',
];

var sanitizePathtoken = exports.sanitizePathtoken = function(token) {
  if (_.isString(token) && token.length != 0) {
    token = token.replace(/[']/g, '')
                 .replace(/[^a-zA-Z0-9]/g, '-')
                 .replace(/-+/g, '-')
                 .replace(/^-|-$/g, '')
                 .toLowerCase();
    return token;
  } else {
    return null;
  }
}
