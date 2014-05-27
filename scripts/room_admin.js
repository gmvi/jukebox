// room variable has been provided by room.jade
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
  // var peer;
  // var connections = {};
  $.get("/api/rooms/"+room+"/peer", function(data)
  { peerid = data.peer;
    if (peerid)
      peer = new Peer(peerid, {host:"localhost", port:80, path:"/peer"});
    else
    { peer = new Peer({host:"localhost", port:80, path:"/peer"});
      peer.on('open', function()
      { console.log(peer.id);
        $.ajax({ url: "/api/rooms/"+room+"/peer",
          type: "PUT",
          data: {"peer": peer.id},
          success: function(data)
          { peer.on('connection', function(dataConnection)
            { connections[dataConnection.peer] = dataConnection;
              dataConnection.on('data', function(data)
              { console.log(data);
              });
            });
          }
        });
      });
    }
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
