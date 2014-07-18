var app = require('../app.js');
var db = require('../db.js');

app.get('/', function view_index(req, res)
{ res.render('index');
});

app.get('/login', function log_in(req, res)
{ req.session.userid = req.sessionID;
  res.redirect(req.query.return_url || '/');
});

app.get('/logout', function log_out(req, res)
{ if (req.session.room)
    db.CloseRoom(req.session.room);
  delete req.session.userid;
  delete req.session.room;
  res.redirect(req.query.return_url || '/')
})

app.get('/:room', function view_room(req, res, next)
{ db.GetRoomByName(res.room, function (err, room)
  { if (err) throw err;
    if (room)
    { if (room.host === req.session.userid)
        res.render('room_admin');
      else
        res.render('room_user');
    }
    else
      next();
  });
});