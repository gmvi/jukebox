var peer = require('peer');
var db = require('./db');

module.exports = function(db)
{ var peerserver = new peer.PeerServer({port: 5002});

  // Custom logic here

  return peerserver;
}