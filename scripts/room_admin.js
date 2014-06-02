var peer;
var connections = {};
$(document).ready(function()
{ $("#close").click(function(e)
  { $.ajax({ url: "/api/rooms/"+room,
             type: "DELETE",
             success: function(data)
             { if (data.status == "success")
                 window.location.assign("/");
               else
                console.log(data);
             }
           });
  });
  $("#add-song").click(function(e)
  { var file = document.getElementById("song-file").files[0];
    var reader = new FileReader(file);
    reader.onload = function(evt) {
      song = evt.target.result;
      console.log("song read");
    };
    reader.readAsBinaryString(file);
  });
  $.get("/api/rooms/"+room+"/peer", function(data)
  { var peerid = data.peer;
    if (peerid)
    { peer = new Peer(peerid, {host: window.location.hostname, port: 5002});
      peer.on('error', function (err)
      { if (err.type == 'unavailable-id')
        { throw new Error("ID Unavailable");
        }
      });
    }
    else
    { peer = new Peer({host: window.location.hostname, port: 5002});
      peer.on('open', function()
      { console.log(peer.id);
        $.ajax({ url: "/api/rooms/"+room+"/peer",
          type: "PUT",
          data: {"peer": peer.id}
        });
      });
    }
    peer.on('connection', function(dataConnection)
    { connections[dataConnection.peer] = dataConnection;
      dataConnection.on('data', function(data)
      { console.log(data);
      });
    });
  });
  // window.onbeforeunload = function()
  // { return "Navigating away will close the room!";
  // }
  // window.onunload = function()
  // { $.ajax({ url: "/api/rooms/"+room,
  //            type: "DELETE"
  //          });
  // }
});
