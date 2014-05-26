$(document).ready(function()
{ $("#song").change(function(e)
  { var name = e.target.files[0] ? e.target.files[0].name : "";
    $("#song-disp").val(name);
  });
});