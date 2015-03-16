$(document).ready(function()
{ $("#song-file").change(function(e)
  { var name;
    if (e.target.files[0])
    { name = e.target.files[0].name;
      $("#add-song").attr("disabled", false);
    }
    else
    { name = "";
      $("#add-song").attr("disabled", true);
    }
    $("#song-disp").val(name);
  });
});