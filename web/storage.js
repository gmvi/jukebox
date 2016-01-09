var EventEmitter = require('eventemitter3');
var utils = require('./utils');

var TOP_NAMESPACE = 'ns';
var SEP = '/';
var namespaceRegex = /^ns\/([^\/]+)\/(.*)$/;
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
  var key = TOP_NAMESPACE + SEP + SEP + 'namespaces';
  // TODO: optimize this with a :-concatenated string instead of JSON.
  var namespaces = JSON.parse(localStorage.getItem(key));
  if (!_.isArray(namespaces)) namespaces = [];
  if (!_.contains(namespaces, namespace)) namespaces.push(namespace);
  localStorage.setItem(key, JSON.stringify(namespaces));
  var prefix = TOP_NAMESPACE + SEP + namespace + SEP + SEP;
  localStorage.setItem(prefix + 'keys', '[]');
  localStorage.setItem(prefix + 'ts', Date.now());
};

var clearNamespaces = function() {
  var namespacesKey = TOP_NAMESPACE + SEP + SEP + 'namespaces';
  var namespaces = JSON.parse(localStorage.getItem(namespacesKey));
  if (!_.isArray(namespaces)) namespaces = [];
  for (var i = 0; i < namespaces.length; i++) {
    var namespace = namespaces[i];
    var prefix = TOP_NAMESPACE + SEP + namespace + SEP;
    var key = prefix + SEP + 'ts';
    var timestamp = Number(localStorage.getItem(key));
    if (timestamp + NAMESPACE_TIMEOUT < Date.now()) {
      var storage = new NamespacedStorage(namespace);
      storage.clear();
      _.pullAt(namespaces, i);
      i--;
      localStorage.setItem(key, JSON.stringify(namespaces));
    }
  };
};
clearNamespaces();
setInterval(clearNamespaces, CLEANUP_INTERVAL);

// events
var emitter = new EventEmitter();
var lastKeyName = null;
var lastValue = null;
window.addEventListener('storage', function(e) {
  if (e.key.startsWith(TOP_NAMESPACE + SEP)) {
    var startPos = TOP_NAMESPACE.length + 1;
    var match = e.key.match(namespaceRegex);
    if (!match) return;
    var namespace = match[0];
    var keyName = match[1];
    if (keyName[0] === SEP) {
      // internal key, ignore
      return;
    }
    e.keyName = keyName;
    e.namespace = namespace;
    emitter.emit(namespace, e);
  }
});

// storage object
var NamespacedStorage = module.exports = function(namespace) {
  EventEmitter.call(this);
  this.prefix = TOP_NAMESPACE + SEP + namespace + SEP;
  this.internalPrefix = this.prefix + SEP;

  addNamespace(namespace);

  var emit = function(e) {
    this.emit('storage', e);
  };
  emitter.on(namespace, emit, this);

  this.destroy = function() {
    emitter.off(namespace, emit);
  };

  // TODO: make this compliant with the Web Storage standard
  // defineGetter( NamespacedStorage.prototype, 'length', function () {
  //   return localStorage.getItem(internalPrefix+'length');
  // });
}
_.assign(NamespacedStorage.prototype, {
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
window.NamespacedStorage = NamespacedStorage;
