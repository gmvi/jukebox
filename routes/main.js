var app = require('../app.js');
var db = require('../db.js');

app.get('/', function view_index(req, res)
{ res.locals.userRoom = req.session.room;
  res.locals.rooms = [];
  res.render('index');
});

app.get('/:room', function view_room(req, res, next)
{ db.GetRoomByName(res.room, function (err, room)
  { if (err) throw err;
    if (room)
    { if (room.host == req.sessionID)
        res.render('room_admin');
      else
        res.render('room_user');
    }
    else
      next();
  });
});