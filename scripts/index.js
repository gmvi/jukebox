(function() {
  var peer;
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
  makePeer(localStorage.getItem('peerid'));

  $(function() {
    $("#room").on('input propertychange paste', function(e) {
      if(e.target.value && peer && peer.id) {
        $("#create-warning").addClass("hidden");
        $("#create-room").addClass("btn-default")
                         .removeClass("btn-danger")
                         .attr('disabled', false);
      }
      else
        $("#create-room").attr('disabled', true);
    });
    $("#create-room").click(function create_room(e) {
      var room = $("#room").val();
      $.post("/api/rooms", {room: room, host: peer.id}, function(data, status, jqXHR) {
        if (data.status == "failure") {
          $("#create-warning").removeClass("hidden");
          $("#create-room").addClass("btn-danger")
                           .removeClass("btn-default")
                           .attr('disabled', true);
        }
        else {
          window.location.assign("/"+data.room);
        }
      });
    });
    $(window).on('unload', function() {
      peer.destroy();
    });
  });
})();