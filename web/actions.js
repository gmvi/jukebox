var _      = require('lodash'),
    Reflux = require('reflux');
var request = require('superagent');

var asyncActions = function(actionNames) {
  if (!_.isArray(actionNames)) {
    throw new TypeError('asyncActions takes an Array');
  }
  var o = {};
  _.forEach(actionNames, function(name) {
    o[name] = { asyncResult: true };
  });
  return o;
}

var general = exports.general = Reflux.createActions([
  asyncActions([
    'createRoom',
    'updateRoom',
    'closeRoom',
    'joinRoomAsHost',
    'joinRoomAsClient',
  ]),

  'handleError',
  'clearError',

  'updateInfo',
]);

var peer = exports.peer = Reflux.createActions([
  'peerEstablished',
]);

var room = exports.room = Reflux.createActions([
  asyncActions([
    'update',
  ]),
]);

var clients = exports.clients = Reflux.createActions([
  'newClient',
  'selfProfileUpdate',
  'otherProfileUpdate',
]);

var playlist = exports.playlist = Reflux.createActions([
  'update',
  'updated',
]);

var queue = exports.queue = Reflux.createActions([
  'addTrack',
  'removeTrack',
  'updated',
]);

var player = exports.player = Reflux.createActions([
  'togglePause',
  'next',
]);

var files = exports.files = Reflux.createActions([
]);
