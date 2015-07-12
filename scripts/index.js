(function($) {
  $(function() {
    $("#room").on('input propertychange paste', function(e) {
      $("#create-room").attr('disabled', !Boolean(e.target.value));
    });
    $("#room").trigger('input');
    $("#create-room").click(function create_room(e) {
      var room = $("#room").val();
      console.log('yo');
      $.post("/api/rooms", { room: room }).then(function(data, status) {
        console.log(status);
        window.location.assign("/"+room);
      }, function(jqXHR, status, err) {
        var data = JSON.parse(jqXHR.responseText);
        if (data.reason == 'multiple') {
          window.location.assign("/");
        } else if (data.reason == 'occupied') {
          console.log('occupied');
        }
      });
    });
    $(window).on('unload', function() {
      peer.destroy();
    });
  });
})(jQuery);