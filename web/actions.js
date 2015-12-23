var Reflux = require('reflux');

var general = exports.general = Reflux.createActions([
  "createRoom",
  "closeRoom",
  "handleError",
  "clearError",
]);

var peers = exports.peers = Reflux.createActions([
  "newConnection"
]);

var playlist = exports.playlist = Reflux.createActions([
  "addSong"
]);
