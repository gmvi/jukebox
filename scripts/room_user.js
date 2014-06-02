var peer;
var connection;
var file;
$(document).ready(function()
{ $.get("/api/rooms/"+room+"/peer", function(data)
  { peerid = data.peer;
    if (peerid)
    { peer = new Peer({host: window.location.hostname, port: 5002});
      connection = peer.connect(peerid);
    }
    else
    { throw new Error("no host peer to connect to");
    }
  });
  $("#add-song").click(function(e)
  { file = document.getElementById("song-file").files[0];
  });
});