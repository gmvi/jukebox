var _ = require('lodash'),
    EventEmitter = require('eventemitter3');
var utils = require('./utils');

var PREFIX = 'ns';
var SEP = '/';
var namespaceRegex = /^ns\/([^\/]+?)\/(.*)$/;
var NAMESPACE_TIMEOUT = 1000*60*60*24; // 24 hours
var CLEANUP_INTERVAL = 1000*60*60; // 1 hour

var defineGetter = function(obj, attr, func) {
  if (!_.isFunction(func)) {
    var val = func;
    func = function() { return val; };
  }
  Object.defineProperty( obj, attr, { get: func } );
}

// namespace can't contain the separator character
var addNamespace = function(namespace) {
  var key = PREFIX + SEP + SEP + 'namespaces';
  // TODO: optimize this with a :-concatenated string instead of JSON.
  var namespaces = JSON.parse(localStorage.getItem(key));
  if (!_.isArray(namespaces)) namespaces = [];
  if (!_.contains(namespaces, namespace)) namespaces.push(namespace);
  localStorage.setItem(key, JSON.stringify(namespaces));
  var prefix = PREFIX + SEP + namespace + SEP + SEP;
  localStorage.setItem(prefix + 'keys', '[]');
  localStorage.setItem(prefix + 'ts', Date.now());
};

var clearNamespaces = function() {
  var namespacesKey = PREFIX + SEP + SEP + 'namespaces';
  var namespaces = JSON.parse(localStorage.getItem(namespacesKey));
  if (!_.isArray(namespaces)) namespaces = [];
  for (var i = 0; i < namespaces.length; i++) {
    var namespace = namespaces[i];
    var prefix = PREFIX + SEP + namespace + SEP;
    var key = prefix + SEP + 'ts';
    var timestamp = Number(localStorage.getItem(key));
    if (timestamp + NAMESPACE_TIMEOUT < Date.now()) {
      var storage = new NamespacedStorage(namespace);
      storage.clear();
      _.pullAt(namespaces, i);
      i--;
      localStorage.setItem(namespacesKey, JSON.stringify(namespaces));
    }
  };
};

// events
var emitter = new EventEmitter();
var lastKeyName = null;
var lastValue = null;
window.addEventListener('storage', function(e) {
  if (e.key.startsWith(PREFIX + SEP)) {
    var startPos = PREFIX.length + 1;
    var match = e.key.match(namespaceRegex);
    if (!match) return;
    var namespace = match[1];
    var keyName = match[2];
    if (keyName[0] === SEP) {
      // internal key, ignore
      return;
    }
    var e2 = _.pick(e, 'oldValue', 'newValue', 'url', 'storageArea');
    e2.key = keyName;
    e2.namespace = namespace;
    emitter.emit(namespace, e2);
  }
});

// storage object
var NamespacedStorage = module.exports = function(namespace) {
  EventEmitter.call(this);
  this.prefix = PREFIX + SEP + namespace + SEP;
  this.internalPrefix = this.prefix + SEP;

  addNamespace(namespace);

  var emit = (function(e) {
    this.emit('storage', e);
  }).bind(this);
  emitter.on(namespace, emit);

  this.destroy = function() {
    emitter.off(namespace, emit);
  };

  // TODO: make this compliant with the Web Storage standard
  // defineGetter( NamespacedStorage.prototype, 'length', function () {
  //   return localStorage.getItem(internalPrefix+'length');
  // });
}
_.extend(NamespacedStorage.prototype, EventEmitter.prototype, {
  // TODO: make this compliant with the Web Storage standard
  // key: function(i) {
  //   var keys = JSON.parse(localStorage.getItem(internalPrefix+'keys'));
  //   return keys[i];
  // },

  getItem: function(keyName) {
    if (keyName[0] === '/') throw new Error('can\'t start keyName with /');
    var key = this.prefix + keyName;
    this.touch();
    return localStorage.getItem(key);
  },

  setItem: function(keyName, value) {
    if (keyName[0] === '/') throw new Error('can\'t start keyName with /');
    var keysKey = this.internalPrefix + 'keys';
    var keys = JSON.parse(localStorage.getItem(keysKey));
    if (!_.contains(keys, keyName)) {
      keys.push(keyName);
      localStorage.setItem(keysKey, JSON.stringify(keys));
    }
    var key = this.prefix + keyName;
    localStorage.setItem(key, value);
    this.touch();
  },

  removeItem: function(keyName) {
    if (keyName[0] === '/') throw new Error('can\'t start keyName with /');
    var keysKey = this.internalPrefix + 'keys';
    var keys = JSON.parse(localStorage.getItem(keysKey));
    if (_.contains(keys, keyName)) {
      _.remove(keys, keyName);
      localStorage.setItem(keysKey, JSON.stringify(keys));
    }
    var key = this.prefix + keyName;
    localStorage.removeItem(key);
    this.touch();
  },

  clear: function() {
    var key = this.internalPrefix + 'keys';
    var keyNames = JSON.parse(localStorage.getItem(key));
    keyNames.forEach(function(keyName) {
      var key = this.prefix + keyName;
      localStorage.removeItem(key);
    });
    (['ts', 'keys']).forEach(function(internalKeyName) {
      var key = this.internalPrefix + internalKeyName;
      localStorage.removeItem(key);
    });
  },

  touch: function() {
    var key = this.internalPrefix + 'ts';
    localStorage.setItem(key, Date.now());
  },
});

// periodically clean up old namespaces
clearNamespaces();
setInterval(clearNamespaces, CLEANUP_INTERVAL);

window.NamespacedStorage = NamespacedStorage;
