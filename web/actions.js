var Reflux = require('reflux');

var general = exports.general = Reflux.createActions([
  "createRoom",
  "roomCreated",
  "closeRoom",

  "joinRoom",
  "roomJoined",

  "handleError",
  "clearError",
]);

var hostPeer = exports.hostPeer = Reflux.createActions([
  "connection",
  "send",
  "recieve",
]);

var clientPeer = exports.clientPeer = Reflux.createActions([
  "connect",
  "send",
  "recieve",
]);

var playlist = exports.playlist = Reflux.createActions([
  "addSong",
  "removeSong",
  "songAdded",
  "songRemoved",
  "songChanged",
]);

var controller = exports.controls = Reflux.createActions([
  "togglePause",
  "next",
  "previous"
]);
