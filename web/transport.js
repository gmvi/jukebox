var _            = require('lodash'),
    Peer         = require('peerjs'),
    EventEmitter = require('eventemitter3');

var Router = require('./router');
var Responder = require('./responder');

THREAD_TIMEOUT = 1000*60*1; // 1 minute

var noop = function() {};

var once = function(callback) {
  if (_.isFunction(callback)) return _.once(callback);
  else return null;
}

var generateToken = function(notIn) {
  if (!_.isObject(notIn)) notIn = Object.create(null);
  var n = 2176782336 // 36^6
  var token = null;
  while (token === null || token in notIn) {
    var r = Math.floor(Math.random()*n);
    var a = [];
    for (var i = 0; i < 6; i++) {
      a.push((r % 36).toString(36));
      r >>>= 36;
    }
    token = a.join('');
  }
  return token;
}

var ClientRecord = function ClientRecord(id, secret, conn) {
  EventEmitter.call(this);
  this.id = id;
  this.secret = secret;
  this.threads = {};
  this.connections = {};
  this.main = null;
  if (conn) {
    this.add(conn, true);
  }
}
_.assign(ClientRecord.prototype, EventEmitter.prototype, {
  // adds a peerjs DataConnection to a client record, optionally upgrading it
  // to the primary connection
  add: function(conn, isPrimary) {
    this.cleanUpConnections();
    conn.on('data', (data) => {
      console.log('got data:', data);
      if (data.thread in this.threads) {
        // this data is a response
        var callback = this.threads[data.thread];
        delete this.threads[data.thread];
        callback(null, data);
      } else {
        this.emit('data', data);
      }
    });
    this.connections[conn.peer] = conn;
    if (isPrimary || !_.has(this.connections, this.main)) {
      this.main = conn.peer;
    }
  },
  // removes a peerjs DataConnection from a client record by peer id
  remove: function(peerId) {
    // if this peer isn't recorded for this client, return
    if (!_.has(this.connections, peerId)) return;
    var conn = this.connections[peerId];
    delete this.connections[peerId];
    // if main isn't connected, clear it
    if (!_.has(this.connections, this.main)) {
      this.main = null;
      // assign a new main if possible
      var connectionIds = Object.keys(this.connections);
      if (connectionIds.length) {
        this.main = connectionIds[0];
      }
    }
  },
  // close events don't fire in firefox
  cleanUpConnections: function() {
    _.forEach(this.connections, (conn, id) => {
      if (!conn.open) {
        delete this.connections[id];
        this.connectionCount--;
      }
    });
  },
  send: function(data, callback) {
    this.cleanUpConnections();
    if (this.main === null || !_.has(this.connections, this.main)) {
      //TODO: should something happen?
      return
    }
    if (callback) {
      var thread = generateToken(this.threads);
      data.thread = thread;
      this.recordCallback(thread, function(err, res) {
        if (err) callback(err);
        else callback(null, res);
      });
    }
    console.log('sending data:', data);
    this.connections[this.main].send(data);
  },
  recordCallback: function(thread, callback) {
    var timeout = setTimeout(() => {
      delete this.threads[thread];
      callback(new Error('timeout'));
    }, THREAD_TIMEOUT);
    this.threads[thread] = function(res) {
      clearTimeout(timeout);
      callback(null, res);
    };
  },
});

// Notes:
// Works similar to http methods. GET must have a response. POST may specify no
// thread id, in which case it will not recieve a response.

// creates a PeerJS Peer object
exports.create = function create(callback) {
  // set up main PeerJS object
  var peer = new Peer({
    host: window.location.hostname,
    port: window.location.port,
    path: '/peerjs',
  });
  // shared host/client
  peer.on('close', function() {
    console.log('error: peer closed');
  });
  peer.on('disconnected', function() {
    console.log('peer disconnected');
  });
  peer.on('error', function(err) {
    switch (err.type) {
      case 'peer-unavailable':
        var id = err.message.match(/peer (.*)\b/)[1];
        peer.emit('peer-unavailable', id, err);
        window.debug = window.debug || {};
        window.debug.err = err;
        return;
      default:
        console.log('PeerJS:', err, '\n', err.type);
        return;
    }
  });
  peer.on('open', function(id) {
    callback(null, peer);
  });
}

exports.HostNode = function HostNode(peer, clientSecrets) {
  this.peer = peer;
  this.hostSecondaries = {};
  this.clients = {
  };
  this.router = new Router();
  this.listening = false;

  // private method
  // clientId is a string, and must be a key of this.clients
  // conn is a PeerJS DataConnection
  var hookUpClient = (client) => {
    client.on('data', (data) => {
      var req = data;
      req.clientId = client.id;
      var res = new Responder(req, function (data) {
        if (req.thread) {
          data.thread = req.thread;
          client.send(data);
        }
      });
      this.router.handle(req, res, function () {
        if (req.thread) {
          res.sendStatus(404);
        }
      });
    });
  };
  _.forEach(clientSecrets, (secret, clientId) => {
    this.clients[clientId] = new ClientRecord(clientId, secret);
    hookUpClient(this.clients[clientId]);
  });

  this.peer.on('connection', (conn) => {
    // don't accept before listening
    if (!this.listening) {
      conn.close();
    }
    console.log('new connection');
    var auth = conn.metadata;
    // Accept three auth modes, in order: host, established client, new client
    if (this.acceptHostSecondary(auth)) {
      console.log('accepting host secondary');
      this.hostSecondaries[conn.peer] = conn;
      // TODO: hook up data handler if queued files aren't persisted
    } else if (auth.clientId) {
      var client = this.clients[auth.clientId];
      if (client !== undefined && client.secret === auth.secret) {
        console.log('accepting new connection from client', client.id);
        // record connection
        client.add(conn);
      } else {
        console.log('rejecting established client');
        conn.send({
          method: 'post',
          path: 'error',
          body: 'invalid client auth',
        });
        conn.close();
      }
    } else if (this.acceptNewClient(auth)) {
      console.log('accepting new client');
      // register new client
      var clientId = generateToken(this.clients);
      var secret = generateToken();
      var client = new ClientRecord(clientId, secret, conn);
      this.clients[clientId] = client;
      conn.on('open', () => {
        console.log('new client, sending auth');
        var data = {
          method: 'post',
          path: 'auth',
          body: {
            clientId: clientId,
            secret: secret,
          },
        }
        client.send(data, (err, res) => {
          if (err) {
            console.log('client failed to acknowelege credentials');
            // clear these credentials, they didn't make it to the client
            delete this.clients[clientId];
          } else {
            console.log('accepting new client');
            hookUpClient(client);
            this.handleNewClient(clientId, secret);
          }
        });
      });
    } else {
      console.log('rejecting new client');
      conn.send({
        method: 'post',
        path: 'error',
        body: 'invalid auth',
      });
      conn.close();
    }
  });
}
_.assign(exports.HostNode.prototype, {
  listen: function() {
    this.listening = true;
  },

  acceptNewClient: noop,
  acceptHostSecondary: noop,
  handleNewClient: noop,
  // callback is function(err, res)
  get: function(clientId, path, callback) {
    if (!_.has(this.clients, clientId)) {
      callback(new Error('no client with that id'));
      return;
    }
    var client = this.clients[clientId];
    client.send({
      thread: thread,
      path: path,
      method: 'get',
    }, callback);
  },
  // optional callback is function(err, res)
  post: function(clientId, path, body, callback) {
    var hasCb = (callback != undefined);
    if (!_.has(this.clients, clientId)) {
      var msg = 'no client with that id';
      if (hasCb) callback(new Error(msg));
      return;
    }
    var client = this.clients[clientId];
    var data = {
      method: 'post',
      path: path,
      body: body,
    }
    client.send(data, callback)
  },
  // notifications don't require callbacks
  postAll: function(path, body) {
    console.log('postAll("'+path+'")');
    _.forOwn(this.clients, function(client) {
      if (!client) return; // since host's clientId is registered in clients
      client.send({
        method: 'post',
        path: path,
        body: body,
      });
    });
  },
});

exports.ClientNode = function ClientNode(peer) {
  this.peer = peer;
  this.connection = null;
  this.threads = {};
  this.authenticated = false;
  this.authError = null;
  this.router = new Router();

  this.queuedMessages = [];

  this.peer.on('connection', function(conn) {
    // don't accept incoming connections
    conn.close();
  });
}
_.assign(exports.ClientNode.prototype, {
  // records a callback for the next event in a thread
  recordCallback: function(thread, callback) {
    var timeout = setTimeout(() => {
      delete this.threads[thread];
      callback(new Error('timeout'));
    }, THREAD_TIMEOUT);
    this.threads[thread] = function(res) {
      clearTimeout(timeout);
      callback(null, res);
    };
  },
  connect: function(hostId, auth, cb) {
    if (this.connection) { throw new Error('can\'t reuse ClientNode'); }
    this.connection = this.peer.connect(hostId, {
      reliable: true,
      metadata: auth,
    });
    this.connection.on('error', function(err) {
      console.log('error from peer.js connection:', err);
    });
    var off = () => {
      this.connection.off('open', openHandler);
      this.peer.off('peer-unavailable', unavailable);
    };
    var openHandler = function() {
      console.log('connection open');
      cb();
      off();
    };
    this.connection.once('open', openHandler);
    var unavailable = function(id, origErr) {
      if (id == hostId) {
        var err = new Error('unavailable');
        err.origErr = origErr;
        cb(err);
        off();
      }
    };
    this.peer.on('peer-unavailable', unavailable);
    // attach the main data handler
    this.connection.on('data', (data) => {
      if (data.thread in this.threads) {
        // this data is part of an established thread
        var callback = this.threads[data.thread];
        delete this.threads[data.thread];
        callback(data);
      } else {
        // new thread starting with a get
        var req = data;
        var res = new Responder(req, (data) => {
          this.connection.send(data);
        });
        this.router.handle(req, res, function () {
          res.sendStatus(404);
        });
      }
    });
  },
  get: function(path, callback) {
    var thread = generateToken(this.threads);
    this.connection.send({
      thread: thread,
      path: path,
      method: 'get',
    });
    this.recordCallback(thread, callback);
  },
  post: function(path, body, callback) {
    var thread;
    var data = {
      path: path,
      method: 'post',
      body: body,
    };
    if (callback !== undefined) {
      thread = generateToken(this.threads);
      data.thread = thread;
      this.recordCalback(thread, callback);
    }
    this.connection.send(data);
  },
});
