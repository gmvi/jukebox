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
    var hostConnection = peer.connect(peerId);
    window.debug = window.debug || {};
    window.debug.conn = hostConnection;
    window.debug.peer = peer;
    // check for connection failure
    var unavailableHandler = function(unavailableId) {
      if (peerId == unavailableId) {
        console.log('primary host unavailable, registering self as host');
        off();
        // TODO: change this b/c it violates actions->stores dataflow
        actions.room.update({ peer: peer.id });
        upgradeHost();
        actions.general.joinRoomAsHost.completed();
      }
    };
    var openHandler = function() {
      console.log('connected to primary host');
    }
    var dataHandler = function(data) {
      if (data.resource == 'auth') {
        if (data.method == 'get') {
          hostConnection.send({
            method: 'post',
            resource: 'auth',
            body: stores.auth.credentials,
          });
        } else if (data.method == 'admit') {
          if (data.body.accepted) {
            console.log('accepted by host');
            hostConnection.off('data', dataHandler);
            actions.general.joinRoomAsHost.completed();
          } else {
            // TODO: handle failed host auth
          }
        } else {
          // invalid auth method
          console.log('invalid auth method from host');
        }
      }
      // else ignore it
    };
    var disconnectHandler = function(err) {
      console.log('error on hostConnection:', err);
      console.log('type:', err.type);
      actions.room.update({ peer: peer.id });
      upgradeHost();
    };
    var off = function() {
      peer.off('peer-unavailable', unavailableHandler);
      hostConnection.off('open', openHandler);
      hostConnection.off('error', disconnectHandler);
      hostConnection.off('data', dataHandler);
    };
    // custom suptype of error event
    peer.on('peer-unavailable', unavailableHandler);
    hostConnection.on('data', dataHandler);
    hostConnection.on('open', openHandler);
    hostConnection.on('error', disconnectHandler);
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
var initClient = waitForPeer(function (auth) {
  console.log('initializing client node');
  controller = new transport.ClientNode(peer);
  window.debug.controller = controller;
  var hostId = stores.room.state.peer;
  controller.connect(hostId, auth, function(err, admitBody) {
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
