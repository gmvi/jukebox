var app = require('../app.js');
var db = require('../db.js');

function fail(res, reason, details)
{ res.status(400);
  res.send({ status: "failure",
             reason: reason,
             details: details });
}

// TODO: rewrite
app.get('/api/rooms/:room', function api_checkroom(req, res, next)
{ db.GetRoomByName(req.params.room, function(err, room) {
    if (err) throw err;
    if (room)
      res.send({ "name": room.name,
                 "host": room.host });
    else
      next();
  });
});

app.post('/api/rooms', function api_createroom(req, res)
{ if (!req.body.room)
    fail(res, "params", "no room param in query string");
  else if (req.session.room)
    fail(res, "multiple", "close your other room and try again");
  else db.RoomExists(req.body.room, function(err, exists)
  { if (exists) fail(res, "occupied");
    else db.CreateRoom(req.body.room, req.session.userid, function (err)
    { req.session.room = req.body.room;
      res.send({ status : "success",
                 room   : req.body.room });
    });
  });
});

//here
app.delete('/api/rooms/:room', function api_deleteroom(req, res, next)
{ db.GetRoomByName(req.params.room, function(err, room)
  { if (room)
    { if (room.host != req.session.userid)
        fail(res, "ownership");
      else
      { db.CloseRoom(req.params.room);
        req.session.room = "";
        res.send({ status: "success" });
      }
    }
    else
      next();
  });
});