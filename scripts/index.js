(function()
{ $(document).ready(function()
  { $("#room").keyup(function(e)
    { if(e.target.value)
      { $("#create-warning").addClass("hidden");
        $("#create-room").addClass("btn-default")
                         .removeClass("btn-danger")
                         .attr('disabled', false);
      }
      else
        $("#create-room").attr('disabled', true);
    });
    $("#create-room").click(function create_room(e)
    { var room = $("#room").val();
      $.post("/api/rooms", {room: room}, function(data, status, jqXHR)
      { if (data.status == "failure")
        { $("#create-warning").removeClass("hidden");
          $("#create-room").addClass("btn-danger")
                           .removeClass("btn-default")
                           .attr('disabled', true);
        }
        else
        { window.location.assign("/"+data.room);
        }
      });
    });
  });
})();