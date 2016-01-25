var _ = require('lodash');

var transport = require('./transport'),
    actions   = require('./actions'),
    stores    = require('./stores'),
    MODE      = require('shared').MODE;

window.debug = window.debug || {};

var peer;
var controller;

transport.create(function(err, _peer) {
  if (err) throw err;
  peer = _peer;
  // I know this is poor modularity, but I don't want to add another action
  stores.general.setState({peerId: peer.id});
  actions.peer.peerEstablished();
});

actions.general.createRoom.completed.listen(function() {
  initPrimaryHost();
});

actions.general.joinRoomAsHost.listen(function() {
  initSecondaryHost();
});

actions.general.joinRoomAsClient.listen(function(auth) {
  console.log('joinRoomAsClient called');
  initClient(auth);
});

var waitForPeer = function(func, thisVal) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var bound = _.once(function() {
      func.apply(thisVal, args);
    });
    if (stores.general.state.peerId) {
      bound();
    } else {
      actions.peer.peerEstablished.listen(bound);
    }
  }
}

// Host logic
var initSecondaryHost = waitForPeer(function() {
  var peerId = stores.room.state.peer;
  if (peerId) {
    // try to connect to host peer
    console.log('primary host record found, trying to connect as secondary');
    var hostConnection = peer.connect(peerId, {
      reliable: true,
      metadata: stores.auth.credentials,
    });
    window.debug = window.debug || {};
    window.debug.conn = hostConnection;
    window.debug.peer = peer;
    // check for connection failure
    var unavailableHandler = function(unavailableId) {
      console.log(unavailableId);
      if (peerId == unavailableId) {
        peer.off('peer-unavailable', unavailableHandler);
        //
        console.log('primary host unavailable, registering self as host');
        actions.room.update({ peer: peer.id });
        actions.general.joinRoomAsHost.completed();
        upgradeHost();
      }
    };
    var openHandler = function() {
      peer.off('peer-unavailable', unavailableHandler);
      //
      console.log('connected to primary host');
      actions.general.joinRoomAsHost.completed();
    };
    var closeHandler = function() {
      console.log('lost connection to primary host');
      actions.room.update({ peer: peer.id });
      upgradeHost();
    };
    var errorHandler = _.once(function(err) {
      peer.off('peer-unavailable', unavailableHandler); // just in case
      //
      console.log('error on hostConnection:', err);
      console.log('type:', err.type);
    });
    var off = function() {
      peer.off('peer-unavailable', unavailableHandler);
    };
    // custom suptype of error event
    peer.on('peer-unavailable', unavailableHandler);
    hostConnection.once('open', openHandler);
    hostConnection.once('error', errorHandler);
    hostConnection.once('close', closeHandler);
  } else {
    console.log('no primary host record found, registering as host');
    actions.room.update({ peer: peer.id });
    upgradeHost();
    actions.general.joinRoomAsHost.completed();
  }
});

var initPrimaryHost = waitForPeer(function() {
  upgradeHost();
});

var upgradeHost = function() {
  controller = new transport.HostNode(peer);
  window.debug.controller = controller;
  controller.acceptHostSecondary = function(auth) {
    return auth.key == stores.auth.credentials.key;
  };
  controller.acceptNewClient = function(auth) {
    return auth.password == stores.room.state.password;
  };
  var router = controller.router;
  router.get('profiles', function(req, res) {
    res.send(stores.clients.getProfiles());
  });
  router.get('info', function(req, res) {
    res.send(stores.settings.state);
  });
  router.post('profile', function(req, res) {
    actions.otherProfileUpdate(req.clientId, req.body);
    res.sendStatus(200);
  });
  router.post('queue', function(req, res) {
    actions.playlist.update(req.clientId, req.body);
    res.sendStatus(200);
  });
  controller.handleClient = function(clientId) {
    actions.clients.newClient(clientId);
  };
  actions.general.updateInfo.listen(function (info) {
    controller.postAll('info', info);
  });
  // actions.clients.selfProfileUpdate.listen(function (update) {
  //   controller.postAll('profiles', update);
  // });
  // actions.clients.otherProfileUpdate.listen(function (update) {
  //   controller.postAll('profiles', update);
  // });
  actions.queue.updated.listen(function(tracks) {
    console.log('queue updated, passing along to playlist store');
    actions.playlist.update(controller.hostId, tracks);
  }),
  actions.playlist.updated.listen(function () {
    controller.postAll('playlist', playlist);
  });
  // actions.playlist.getFile.listen(function (file) {
  //   // what do?
  // });
  controller.listen();
};

// Client logic
var initClient = waitForPeer(function (auth) {
  console.log('initializing client node');
  controller = new transport.ClientNode(peer);
  window.debug.controller = controller;
  var roomPeer = stores.room.state.peer;
  controller.connect(roomPeer, auth, function(err, admitBody) {
    console.log('auth admitted');
    if (err) {
      actions.general.handleError(err);
    } else if (!admitBody.accepted) {
      console.log('Error: auth rejected');
      actions.general.joinRoomAsClient.failed(new Error('auth rejected'));
    } else {
      actions.general.joinRoomAsClient.completed(admitBody);
      controller.handleGet = function(resource, sendPost) {
        if (resource.startsWith("files/")) {
          var split = resource.split('/');
          if (split.length != 2) {
            sendPost({error: "malformed"});
          } else {
            var fileId = split[1];
            // grab from store
          }
        } else {
          console.warn('unimplemented post to resource', resource);
          sendPost({error: 'unimplemented'});
        }
      };
      controller.handlePost = function(resource, postBody) {
        if (resource === 'playlist') {
          actions.playlist.updated(postBody);
        } else if (resource === 'queue') {
          actions.queue.pop();
        } else if (resource === 'profiles') {
          actions.clients.otherProfileUpdated(postBody);
        } else {
          console.warn('unimplemented post to resource', resource);
          sendPost({error: 'unimplemented'});
        }
      };
      actions.queue.updated.listen(function(tracks) {
        controller.post('queue', tracks);
      });
    }
  });
});
