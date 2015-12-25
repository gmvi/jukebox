var peer = new Peer({
  host: window.location.port,
  port: window.location.port,
  path: '/peerjs',
});

var connections = Object.create(null);

peer.on('open', function(id) {
});

peer.on('connection', function(dataConnection) {
  
});

peer.on('close', function() {
  console.log('error: peer closed');
});

peer.on('disconnected', function() {
});
