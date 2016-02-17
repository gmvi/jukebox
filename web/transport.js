var _    = require('lodash'),
    Peer = require('peerjs');

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
  this.id = id;
  this.secret = secret;
  this.threads = {};
  if (conn) {
    this.connections = {[conn.peer]: conn};
    this.connectionCount = 1;
    this.main = conn.peer;
  } else {
    this.connections = {};
    this.connectionCount = 0;
    this.main = null;
  }
}
_.assign(ClientRecord.prototype, {
  // adds a peerjs DataConnection to a client record, optionally making it the
  // main connection
  add: function(conn, isMain) {
    this.cleanUpConnections();
    this.connections[conn.peer] = conn;
    this.connectionCount++;
    if (isMain || !_.has(this.connections, this.main)) {
      this.main = conn.peer;
    }
  },
  // removes a peerjs DataConnection from a client record by peer id
  remove: function(peerId) {
    // if this peer isn't recorded for this client, return
    if (!_.has(this.connections, peerId)) return;
    var conn = this.connections[peerId];
    delete this.connections[peerId];
    this.connectionCount--;
    // if main isn't connected, clear it
    if (!_.has(this.connections, this.main)) {
      this.main = null;
      // assign a new main if possible
      if (this.connectionCount != 0) {
        this.main = Object.keys(this.connections)[0];
      }
    }
  },
  cleanUpConnections: function() {
    _.forEach(this.connections, (conn, id) => {
      if (!conn.open) {
        delete this.connections[id];
        this.connectionCount--;
      }
    });
  },
  send: function(data) {
    console.log('sending', data);
    if (this.main === null || !_.has(this.connections, this.main)) {
      throw new Error('client disconnected');
    }
    this.connections[this.main].send(data);
  },
});

// Notes:
//   A thread is a chain of communication, such as get-post-admit or post-admit.
//   When a get is issued, it must contain a thread token, and the receiving
//   party must return a post.
//   When a post is issued, it may contain a thread token. If it does, then the
//   receiving party should (must?) return an admit.
//   If a get or post fails to elicit a response before an established timeout,
//   then the thread is broken, and a timeout handler will invoke the callback
//   for the waiting party with an error
// Methods:
//   get: request data from a resource (a post should be returned)
//   post: send data to a resource (may follow a get; an admit may be returned)
//   admit: acknowledge a post (must follow a post)

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
  this.hostId = '0';
  this.hostSecondaries = {};
  this.clients = {
    [this.hostId]: null
  };
  _.forEach(clientSecrets, (secret, clientId) => {
    this.clients[clientId] = new ClientRecord(clientId, secret);
  });
  this.router = new Router();
  this.listening = false;

  // private method
  // clientId is a string, and must be a key of this.clients
  // conn is a PeerJS DataConnection
  var hookUpClient = (clientId, conn) => {
    conn.on('data', (data) => {
      if (data.thread in this.clients[clientId].threads) {
        // this data is a response
        var callback = this.clients[clientId].threads[data.thread];
        delete this.clients[clientId].threads[data.thread];
        callback(err, data.body);
      } else {
        var req = data;
        req.clientId = clientId;
        var res = new Responder(req, function (data) {
          conn.send(data);
        });
        this.router.handle(req, res, function () {
          res.sendStatus(404);
        });
      }
    });
  };

  this.peer.on('connection', (conn) => {
    // don't accept before listening
    if (!this.listening) {
      conn.close();
    }
    console.log('new connection, requesting auth');
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
        client.add(conn, auth.main);
        hookUpClient(client.id, conn);
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
      this.clients[clientId] = new ClientRecord(clientId, secret, conn);
      hookUpClient(clientId, conn);
      conn.on('open', function() {
        console.log('sending auth');
        conn.send({
          method: 'post',
          path: 'auth',
          body: {
            clientId: clientId,
            secret: secret,
          },
        });
      });
      this.handleNewClient(clientId, secret);
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

  // records a callback for the next event in a thread
  // clientId must be a member of this.clients
  recordCallback: function(clientId, thread, callback) {
    var threads = this.clients[clientId].threads;
    var timeout = setTimeout(function() {
      delete threads[thread];
      callback(new Error('timeout'));
    }, THREAD_TIMEOUT);
    threads[thread] = function(res) {
      clearTimeout(timeout);
      callback(null, res);
    };
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
    var thread = generateToken(client.threads);
    client.send({
      thread: thread,
      path: path,
      method: 'get',
    });
    this.recordCallback(thread, function(err, res) {
      if (err) callback(err);
      else callback(null, res);
    });
  },
  post: function(clientId, path, callback) {
    var hasCb = (callback != undefined);
    if (!_.has(this.clients, clientId)) {
      var msg = 'no client with that id';
      if (hasCb) callback(new Error(msg));
      else throw new Error(msg);
      return;
    }
    var client = this.clients[clientId];
    var data = {
      path: path,
      method: 'post',
    }
    if (hasCb) {
      var thread = generateToken(client.threads);
      data.thread = thread;
      this.recordCallback(thread, function(err, res) {
        if (err) callback(err);
        else callback(null, res);
      });
    }
    client.send(data);
  },
  // notifications don't require callbacks
  postAll: function(path, body) {
    console.log('postAll("'+path+'")');
    _.forOwn(this.clients, function(client) {
      if (!client) return; // since host's clientId is registered in clients
      client.send({
        path: path,
        method: 'post',
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
