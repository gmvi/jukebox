var _ = require('lodash');

function Enum(values) {
  // javascript getters are so awkward
  Object.defineProperty(this, 'values', { get: function() {
    // clone the array. Enums must be static.
    return values.slice(0);
  }});
  for (var i = 0; i < values.length; i++) {
    var value = values[i].toUpperCase();
    this[value] = value;
  }
  this.has = function(value) {
    return value.toUpperCase() in this;
  }
}

exports.MODE = new Enum([ 'CREATE', 'JOIN', 'ERROR', ]);

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
