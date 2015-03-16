var peer;
var connection;
var file;
$(document).ready(function() {
  var opts = {key: '2b8dmz7g92ievcxr'};
  peer = new Peer(opts);
  connection = peer.connect(host);
  $("#add-song").click(function(e)
  { file = document.getElementById("song-file").files[0];
  });
});