var _ = require('lodash');

var transport = require('./transport'),
    actions   = require('./actions'),
    stores    = require('./stores'),
    MODE      = require('shared').MODE;

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
  initHost();
});

actions.general.joinRoomHost.listen(function() {
  console.log('joinRoomHost called');
  initHost();
});

actions.general.joinRoomClient.listen(function() {
  console.log('joinRoomClient called');
  initClient();
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
      actions.general.peerEstablished.listen(bound);
    }
  }
}

// Host logic
var initHost = waitForPeer(function() {
  var peerId = stores.room.peer;
  var password = stores.room.password;
  if (peerId) {
    // try to connect to host peer
    var hostConnection = peer.connect(peerId);
    // what do I do with this?
    // do I need to add websockets?
    // first to write to localStorage wins?
    hostConnection.on('error', function(err) {
      console.log(err);
    });
  } else {
    upgradeHost();
  }
});

var upgradeHost = function() {
  controller = new transport.HostNode(peer);
  controller.acceptHostSecondary = function(auth) {
    return auth.key == stores.room.key;
  };
  controller.acceptNewClient = function(auth) {
    return auth.password == stores.room.password;
  };
  controller.handleGet = function(clientId, resource, sendPost) {
    if (resource === 'profiles') {
      sendPost(stores.clients.getProfiles());
    } else if (resource === 'info') {
      sendPost(stores.settings.state);
    } else {
      console.warn('unimplemented get to resource', resource);
      sendPost({error: 'unimplemented'});
    }
  };
  controller.handlePost = function(clientId, resource, postData, sendAdmit) {
    if (resource === 'profile') {
      actions.otherProfileUpdate(postData);
      sendAdmit({accepted: true});
    } else if (resource === 'queue') {
      _.forEach(postData, function(change) {
        if (change.sign == 'add') {
          actions.playlist.addTrack(change);
        } else if (change.sign == 'remove') {
          actions.playlist.removeTrack(change);
        }
      });
      sendAdmit({accepted: true});
    } else {
      console.warn('unimplemented post to resource', resource);
      sendPost({error: 'unimplemented'});
    }
  };
  controller.handleClient = function(clientId) {
    actions.clients.newClient(clientId);
  };
  actions.general.updateInfo.listen(function (info) {
    controller.postAll('info', info);
  });
  actions.clients.selfProfileUpdate.listen(function (update) {
    controller.postAll('profiles', update);
  });
  actions.clients.otherProfileUpdate.listen(function (update) {
    controller.postAll('profiles', update);
  });
  actions.playlist.update.listen(function (playlist) {
    controller.postAll('playlist', playlist);
  });
  // actions.playlist.getFile.listen(function (file) {
  //   // what do?
  // });
};

// Client logic
var initClient = waitForClient(function () {
  var hostId = stores.room.peer;
  var auth   = stores.auth.credentials;
  if (!auth) {
    auth = _.pick(stores.room.state, 'password');
  }
  controller = new transport.ClientNode(peer, hostId);
  controller.connect(auth, function(err, admitBody) {
    if (err) {
      actions.general.handleError(err);
    } else if (!admitBody.accepted) {
      console.log('Error: auth rejected');
      actions.general.joinRoom.failed(new Error('auth rejected'));
    } else {
      actions.general.joinRoom.completed();
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
          actions.playlist.update(postBody);
        } else if (resource === 'profiles') {
          actions.clients.otherProfileUpdated(postBody);
        } else {
          console.warn('unimplemented post to resource', resource);
          sendPost({error: 'unimplemented'});
        }
      }
    }
  });
});
