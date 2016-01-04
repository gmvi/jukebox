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
  actions.peer.peerEstablished(peer.id);
  if (stores.general.state.mode === MODE.HOST) {
    actions.peer.initHost();
  } else if (stores.general.state.mode === MODE.CLIENT) {
    actions.peer.initClient();
  }
  // TODO: what do?
});

// Host logic
actions.peer.initHost.listen(function (password) {
  controller = new transport.HostNode(peer, password);
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
});

// Client logic
actions.peer.initClient.listen(function () {
  var hostId = stores.room.peer;
  var auth   = stores.room.auth;
  controller = new transport.ClientNode(peer, hostId);
  controller.connect(auth, function(err, admitBody) {
    if (err) {
      actions.general.handleError(err);
    } else if (!admitBody.accepted) {
      console.log('Error: auth rejected');
      actions.general.handleError(new Error('auth rejected'));
    } else {
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
