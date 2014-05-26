var peer;
var connection;
$(document).ready(function()
{ $.get("/api/rooms/"+room+"/peer", function(data)
  { peerid = data.peer;
    if (peerid)
    { peer = new Peer({host:"localhost", port:9000});
      connection = peer.connect(peerid);
    }
    else
    { console.log("no host peer to connect to");
    }
  });
  $("#add-song").click(function(e)
  { var file = document.getElementById("song").files[0];
    var reader = new FileReader(file);
    reader.onload = function(evt) {
      connection.send(evt.target.result);
    };
    reader.readAsBinaryString(file);
  });
});