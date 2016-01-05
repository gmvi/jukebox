var Reflux = require('reflux');
var request = require('superagent');

var general = exports.general = Reflux.createActions([
  {
    'createRoom': { asyncResult: true },
    'updateRoom': { asyncResult: true },
    'closeRoom': { asyncResult: true },
    'joinRoomAsHost': { asyncResult: true },
    'joinRoomAsClient': { asyncResult: true },
  },

  'handleError',
  'clearError',

  'updateInfo',
]);

var peer = exports.peer = Reflux.createActions([
  'peerEstablished',
]);

var clients = exports.clients = Reflux.createActions([
  'newClient',
  'selfProfileUpdate',
  'otherProfileUpdate',
]);

var queue = exports.queue = Reflux.createActions([
  'selfAddTrack',
  'selfRemoveTrack',
]);

var playlist = exports.playlist = Reflux.createActions([
  'update',
  'addTrack',
  'removeTrack',
]);

var player = exports.player = Reflux.createActions([
  'togglePause',
  'next',
  'previous'
]);

var files = exports.files = Reflux.createActions([
]);
