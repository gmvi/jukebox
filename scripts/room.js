$(document).ready(function()
{ $("#song").change(function(e)
  { var name = "";
    console.log(Boolean(e.target.files[0]));
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