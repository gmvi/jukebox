var EventEmitter = require('eventemitter3');

var TOP_NAMESPACE = 'ns';
var SEP = '/';
var NAMESPACE_TIMEOUT = 1000*60*60*24; // 24 hours
var CLEANUP_INTERVAL = 1000*60*60; // 1 hour

var noop = function () {};

var defineGetter = function(obj, attr, func) {
  if (!_.isFunction(func)) {
    var val = func;
    func = function() { return val; };
  }
  Object.defineProperty( obj, attr, { get: func } );
}

var addNamespace = function(namespace) {
  var key = TOP_NAMESPACE + SEP + SEP + 'namespaces';
  // TODO: optimize this with a :-concatenated string instead of JSON.
  var namespaces = JSON.parse(localStorage.getItem(key));
  namespaces.push(namespace);
  localStorage.setItem(key, JSON.stringify(namespaces));
  var prefix = TOP_NAMESPACE + SEP + namespace + SEP + SEP;
  localStorage.setItem(prefix + 'keys', []);
  localStorage.setItem(prefix + 'ts', TIME.now());
};

var clearNamespaces = function() {
  var namespacesKey = TOP_NAMESPACE + SEP + SEP + 'namespaces';
  var namespaces = JSON.parse(localStorage.getItem(key));
  namespaces.forEach(function(namespace) {
    var prefix = TOP_NAMESPACE + SEP + namespace + SEP;
    var key = prefix + SEP + 'ts';
    var timestamp = Number(localStorage.getItem(key));
    if (timestamp + NAMESPACE_TIMEOUT < Date.now()) {
      var key = prefix + SEP + 'keys';
      var keyNames = JSON.parse(localStorage.getItem(key));
      keyNames.forEach(function(keyName) {
        var key = prefix + keyName;
        localStorage.deleteItem(key);
      });
      ['ts', 'keys'].forEach(function(internalKeyName) {
        var key = prefix + SEP + internalKeyName;
        localStorage.deleteItem(key);
      });
      _.remove(namespaces, namespace);
      localStorage.setItem(key, JSON.stringify(namespaces));
    }
  });
}
clearNamespaces();
setInterval(clearNamespaces, CLEANUP_INTERVAL);

// events
var emitter = new EventEmitter();
var lastKeyName = null;
var lastValue = null;
window.addEventListener('storage', function(e) {
  if (e.key.startswith(TOP_NAMESPACE + SEP)) {
    var startPos = TOP_NAMESPACE.length + 1;
    var room = sliceUntil(e.key, startPos, SEP);
    if (e.key[room.length + 1] === SEP) {
      // internal key, ignore
      return;
    }
    var keyName = e.key.slice(room.length + 1);
    e.keyName = keyName;
    e.namespace = namespace;
    emitter.emit('storage/'+namespace, e);
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
  emitter.on('storage/'+namespace, emit, this);

  this.destroy = function() {
    emitter.removeListener('storage/'+namespace, emit);
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
    if (namespace[0] === '/') throw new Error('can\'t start keyName with /');
    var key = this.prefix + keyName;
    this.touch();
    return localStorage.getItem(key);
  },

  setItem: function(keyName, value) {
    if (namespace[0] === '/') throw new Error('can\'t start keyName with /');
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
    if (namespace[0] === '/') throw new Error('can\'t start keyName with /');
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

  //clear: function(keyName) {
  //  if (namespace[0] === '/') throw new Error('can\'t start keyName with /');
  //  var key = this.prefix + keyName;
  //},
  
  onStorage: noop,

  touch: function() {
    var key = this.internalPrefix + 'ts';
    localStorage.setItem(key, Date.now());
  },
});
window.NamespacedStorage = NamespacedStorage;
