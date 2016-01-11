var _    = require('lodash'),
    Peer = require('peerjs');

THREAD_TIMEOUT = 1000*60*1; // 1 minute

var noop = function() {};

var invoke = function(callback) {
  if (!_.isFunction(callback)) {
    throw new Error();
    console.log('Warning: expected callback function, got '+callback);
    return;
  }
  var args = Array.prototype.slice.call(arguments, 1);
  callback.apply(null, args);
}

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
  this.connections = { [conn.peer]: conn };
  this.connectionCount = 1;
  this.main = conn.peer;
  this.threads = {};
}
_.assign(ClientRecord.prototype, {
  // adds a peerjs DataConnection to a client record, optionally making it the
  // main connection
  add: function(conn, isMain) {
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
  getMain: function() {
    if (this.main === null) return null;
    else return 
  },
  send: function(data) {
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
        peer.emit('peer-unavailable', id);
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

exports.HostNode = function HostNode(peer) {
  this.peer = peer;
  this.hostSecondaries = {};
  this.clients = {};

  // private method
  // clientId is a string, and must be a key of this.clients
  // conn is a PeerJS DataConnection
  var hookUpClient = (function (clientId, conn) {
    conn.on('data', (function(data) {
      if (data.token in this.clients[clientId].threads) {
        // this data is part of an established thread
        var callback = this.clients[clientId].threads[data.token];
        delete this.clients[clientId].threads[data.token];
        invoke(callback, data);
      } else if (data.method == 'get') {
        // new thread starting with a get
        var token = data.token;
        var resource = data.resource;
        this.handleGet(clientId, resource, function(postBody, callback) {
          conn.send({
            token: token,
            resource: data.resource,
            method: 'post',
            body: postBody,
          });
          this.recordCallback(clientId, token, function(err, admitBody) {
            invoke(callback, err, admitBody);
          });
        });
      } else if (data.method == 'post') {
        // new thread starting with a post
        var token = data.token;
        var resource = data.resource;
        var body = data.body;
        this.handlePost(clientId, resource, body, function(admitBody) {
          conn.send({
            token: token,
            resource: data.resource,
            method: 'admit',
            body: admitBody,
          });
        });
      }
    }).bind(this));
  }).bind(this);

  this.peer.on('connection', (function(conn) {
    console.log('new connection, requesting auth');
    var dataHandler = (function(data) {
      if (data.resource !== 'auth') {
        return;
      }
      var sendAdmit = function(body) {
        conn.send({
          resource: 'auth',
          method: 'admit',
          body: body
        });
      };
      var auth = data.body;
      if (!auth) {
        sendAdmit({ accepted: false });
      }
      // Accept three auth modes, in order: host, established client, new client
      if (this.acceptHostSecondary(auth)) {
        console.log('accepting host secondary');
        this.hostSecondaries[conn.peer] = conn;
        // stop listening to the conn
        conn.off('data', dataHandler);
        sendAdmit({ accepted: true });
      } else if (auth.clientId) {
        var client = this.clients[auth.clientId];
        if (client !== undefined && client.secret === auth.clientSecret) {
          console.log('accepting new connection from client', client.id);
          // record connection
          client.add(conn, auth.main);
          conn.off('data', dataHandler);
          hookUpClient(client.id, conn);
          sendAdmit({ accepted: true });
        } else {
          sendAdmit({ accepted: false });
        }
      } else if (this.acceptNewClient(auth)) {
        console.log('accepting new client');
        // register new client
        var clientId = generateToken(this.clients);
        var clientSecret = generateToken();
        this.clients[clientId] = new ClientRecord(clientId, clientSecret, conn);
        conn.off('data', dataHandler);
        hookUpClient(clientId, conn);
        sendAdmit({
          accepted: true,
          clientId: clientId,
          clientSecret: clientSecret,
        });
      } else {
        sendAdmit({ accepted: false });
      }
    }).bind(this);
    conn.on('data', dataHandler);
    conn.once('open', function() {
      conn.send({
        resource: 'auth',
        method: 'get',
      });
    });
  }).bind(this));
}
_.assign(exports.HostNode.prototype, {
  // records a callback for the next event in a thread
  // clientId must be a member of this.clients
  recordCallback: function(clientId, token, callback) {
    var threads = this.clients[clientId].threads;
    var timeout = setTimeout(function() {
      delete threads[token];
      invoke(callback, new Error('timeout'));
    }, THREAD_TIMEOUT);
    threads[token] = function(body) {
      clearTimeout(timeout);
      invoke(callback, null, body);
    };
  },
  // handleGet: function(clientId, resource, sendPost function)
  // sendPost: function(postBody, receiveAdmit callback)
  // receiveAdmit: function(admitBody)
  handleGet: noop,
  // handlePost: function(clientId, resource, postData, sendAdmit function)
  // sendAdmit: function(admitData)
  handlePost: noop,
  // get: function(clientId, resource, recievePost callback)
  // recievePost: function(err, postData, sendAdmit function)
  // sendAdmit: function(admitData)
  get: function(clientId, resource, callback) {
    if (!_.has(this.clients, clientId)) {
      invoke(callback, new Error('no client with that id'));
      return;
    }
    var client = this.clients[clientId];
    var token = generateToken(client.threads);
    client.send({
      token: token,
      resource: resource,
      method: 'get',
    });
    this.recordCallback(token, function(err, postBody) {
      if (err) invoke(callback, err);
      else invoke(callback, null, postBody, function(admitBody) {
        client.send({
          token: token,
          resource: resource,
          method: 'admit',
          body: admitBody,
        });
      });
    });
  },
  // notifications don't require callbacks
  postAll: function(resource, body) {
    _.forOwn(this.clients, function(client) {
      client.send({
        resource: resource,
        method: 'post',
        data: body,
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

  this.peer.on('connection', function(conn) {
    // don't accept incoming connections
    conn.close();
  });
}
_.assign(exports.ClientNode.prototype, {
  // records a callback for the next event in a thread
  recordCallback: function(token, callback) {
    var timeout = setTimeout(function() {
      delete this.threads[token];
      callback(new Error('timeout'));
    }, THREAD_TIMEOUT);
    this.threads[token] = function(body) {
      clearTimeout(timeout);
      callback(null, body);
    };
  },
  connect: function(hostId, auth, callback) {
    callback = once(callback);
    this.connection = this.peer.connect(hostId, {
      reliable: true
    });
    // if we get an error before the auth succeeds, pass it to the callback
    this.connection.on('error', function(err) {
      invoke(callback, err);
    });
    // attach the main data handler
    this.connection.on('data', (function(data) {
      if (data.resource === 'auth') {
        // automatically respond to auth requests
        if (data.method === 'get') {
          this.connection.send({
            token: data.token,
            resource: 'auth',
            method: 'post',
            body: auth,
          });
        } else if (data.method === 'admit') {
          invoke(callback, null, data.body);
        } else {
          console.log('Warning: host responded with invalid method on auth ' + 
                      'resource');
        }
      } else if (data.token in this.threads) {
        // this data is part of an established thread
        var next = this.threads[data.token];
        delete this.threads[data.token];
        invoke(next, data.body);
      } else if (data.method == 'get') {
        // new thread starting with a get
        var token = data.token;
        this.handleGet(data.resource, function(postBody, callback) {
          this.connection.send({
            token: token,
            resource: data.resource,
            method: 'post',
            body: postBody,
          });
          this.recordCallback(token, function(err, admitBody) {
            invoke(callback, err, admitBody);
          });
        });
      } else if (data.method == 'post') {
        // new thread starting with a post
        // for now, a post to a client doesn't have a token
        this.handlePost(data.resource, data.body);
      }
    }).bind(this));
  },
  // handleGet: function(resource, sendPost function)
  // sendPost: function(postBody, receiveAdmit callback)
  // receiveAdmit: function(admitBody)
  handleGet: noop,
  // handlePost: function(resource, postData, sendAdmit function)
  // sendAdmit: function(admitData)
  handlePost: noop,
  // get: function(resource, recievePost callback)
  // recievePost: function(err, postData, sendAdmit function)
  // sendAdmit: function(admitData)
  get: function(resource, callback) {
    var token = generateToken(this.threads);
    this.connection.send({
      token: token,
      resource: resource,
      method: 'get',
    });
    this.recordCallback(token, function(err, postBody) {
      if (err) invoke(callback, err);
      else invoke(callback, null, postBody, function(admitBody) {
        this.conneciton.send({
          token: token,
          resource: resource,
          method: 'admit',
          body: admitBody,
        });
      });
    });
  },
  // post: function(resource, body, receiveAdmit callback)
  // receiveAdmit: function(admitBody)
  post: function(resource, body, callback) {
    var token = generateToken(this.threads);
    this.connection.send({
      token: token,
      resource: resource,
      method: 'post',
      data: body,
    });
    this.recordCalback(token, function(err, admitBody) {
      invoke(callback, err, admitBody);
    });
  },
});
