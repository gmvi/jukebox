var peer;
var connections = {};
$(document).ready(function() {
  var makePeer = function(id, callback) {
    callback = callback || function(){};
    var opts = {key: '2b8dmz7g92ievcxr'};
    if (id) {
      peer = new Peer(id, opts);
      var errorListener = function(err) {
        if (err.type == 'unavailable-id') {
          makePeer(null, callback);
        } else {
          throw err;
        }
      };
      peer.on('error', errorListener);
      peer.on('open', function(id) {
        peer.off('error', errorListener);
        callback();
      });
    } else {
      peer = new Peer(opts);
      peer.on('open', function(id) {
        localStorage.setItem('peerid', id);
        callback();
      });
    }
  }
  if (!sessionStorage.getItem('connected')) {
    sessionStorage.setItem('connected', true);
    makePeer(localStorage.getItem('peerid'), function() {
      peer.on('connection', function(dataConnection) {
        console.log('new connection', dataConnection);
        connections[dataConnection.peer] = dataConnection;
        dataConnection.on('data', function(data) {
          console.log(data);
        });
      });
      peer.on('close', function() {
        sessionStorage.removeItem('connected');
      });
    });
  }
  $("#close").click(function(e) {
    $.ajax({ url: "/api/close_room",
             type: "DELETE",
             success: function(data) {
               if (data.status == "success")
                 window.location.assign("/");
               else
                console.log(data);
             }
           });
  });
  $("#add-song").click(function(e) {
    var file = document.getElementById("song-file").files[0];
    var reader = new FileReader();
    reader.onload = function(evt) {
      song = evt.target.result;
      console.log("song read");
    };
    reader.readAsBinaryString(file);
  });
  $(window).on('unload', function() {
    peer.destroy();
  });
});
