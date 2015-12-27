var Reflux = require('reflux');

var general = exports.general = Reflux.createActions([
  "createRoom",
  "roomCreated",
  "closeRoom",

  "joinRoom",
  "roomJoined",

  "setSelfPeer",

  "handleError",
  "clearError",
]);

var comms = exports.comms = Reflux.createActions([
  "listen",
  "connect",
  "receive",
  "send",
]);

var queue = exports.queue = Reflux.createActions([
  "addTrack",
  "removeTrack",
]);

var playlist = exports.playlist = Reflux.createActions([
  "addSong",
  "removeSong",
  "songAdded",
  "songRemoved",
  "songChanged",
]);

var player = exports.player = Reflux.createActions([
  "togglePause",
  "next",
  "previous"
]);
