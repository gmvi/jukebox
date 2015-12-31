var Peer = require('peerjs');

THREAD_TIMEOUT = 1000*60*1; // 1 minute

var noop = function() {};

var invoke = function(callback) {
  if (!_.isFunction(callback)) {
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

var Client = function Client(id, secret, conn) {
  this.id = id;
  this.secret = secret;
  this.connections = {};
  this.connections[conn.peer] = conn;
  this.connectionCount = 1;
  this.main = conn.peer;
}
Client.prototype = {
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
};

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

function Common() {
  // set up main PeerJS object
  this.peer = new Peer({
    host: window.location.host,
    port: window.location.port,
    path: '/peerjs',
  });
  // shared host/client
  this.peer.on('close', function() {
    console.log('error: peer closed');
  });
  this.peer.on('disconnected', function() {
    console.log('peer disconnected');
  });
}

exports.HostController = function HostController(password) {
  Common.call(this);

  this.password = password;
  this.clients = {};
  this.threads = {};
  
  // private function makeAuthHandler(conn)
  // returns a handler for a post to the 'auth' resource
  var makeAuthHandler = (function (conn) {
    return (function (auth, respond) {
      // Accept two auth modes: password and token
      // If password, verify password and generate a new client profile
      // If token, compare to established client profiles
      if (auth.clientId) {
        var client = this.clients[auth.clientId];
        if (client !== undefined && client.secret === auth.clientSecret) {
          // record connection
          client.add(conn, auth.main);
          hookUpConnection(client.id, conn);
          respond({ accepted: true });
        } else {
          respond({ accepted: false });
        }
      } else if (auth.password === this.password) {
        // register new client
        var clientId = generateToken(this.clients);
        var clientSecret = generateToken();
        this.clients[clientId] = new Client(clientId, clientSecret, conn);
        hookUpConnection(conn);
        respond({
          accepted: true,
          clientId: clientId,
          clientSecret: clientSecret,
        });
      } else {
        respond({ accepted: false });
      }
    }).bind(this);
  }).bind(this);

  // private method
  var hookUpConnection = (function (clientId, conn) {
    conn.on('data', function(data) {
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
    });
  }).bind(this);

  this.peer.on('connection', function(conn) {
    var id = conn.peer;
    connections[id] = conn;
    this.get(conn, 'auth', makeAuthHandler(conn));
  });
}
exports.HostController.prototype = {
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
  listen: function(callback) {
    // TODO: maybe set up the peer here? What if data flows in before the
    // handlers are set?
    if (this.peer.open) {
      invoke(callback, peer.id);
    } else {
      this.peer.on('open', function(id) {
        invoke(callback, null, peer.id);
      });
    }
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
};

exports.ClientController = function ClientController(hostId) {
  Common.call(this);

  this.hostId = hostId;
  this.connection = null;
  this.threads = {};
  this.authenticated = false;
  this.authError = null;

  this.peer.on('connection', function(conn) {
    // don't accept incoming connections
    conn.close();
  });
}
exports.ClientController.prototype = {
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
  connect: function(auth, callback) {
    callback = once(callback);
    this.connection = this.peer.connect(this.hostId, {
      reliable: true
    });
    // if we get an error before the auth succeeds, pass it to the callback
    this.connection.on('error', function(err) {
      invoke(callback, err);
    });
    // attach the main data handler
    this.connection.on('data', (function(data) {
      if (data.resource === 'auth') {
        // divert all auth requests
        if (data.method === 'get') {
          this.connection.send({
            token: data.token,
            resource: 'auth',
            method: 'post',
            body: data.auth,
          });
        } else if (data.method === 'admit') {
          invoke(callback, null, data.body);
        } else {
          console.log('Warning: host responded with invalid method on auth' + 
                      'response');
        }
      } else if (data.token in this.threads) {
        // this data is part of an established thread
        var callback = this.threads[data.token];
        delete this.threads[data.token];
        invoke(callback, data.body);
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
};
