function fail(res, reason, details)
{ res.status(400);
  res.send({ status: "failure",
             reason: reason,
             details: details });
}

var route = function route(app, db)
{ 
  app.use('/api/rooms/:room', function roomexists(req, res, next)
  { if (!db.RoomExists(req.params.room))
    { res.send(404);
    }
    else
    { next();
    }
  })
  app.post('/api/rooms/:room/join', function api_joinroom(req, res)
  { 
  });

  // Rooms

  app.get('/api/rooms/:room', function api_checkroom(req, res)
  { var owner = db.GetOwnerByRoomName(req.params.room);
    res.send({"owner": owner});
  });

  app.post('/api/rooms', function api_createroom(req, res)
  { if (!req.body.room)
      fail(res, "params", "no room param");
    else if (req.session.room)
      fail(res, "multiple", "close your other room and try again");
    else if (db.RoomExists(req.body.room))
    { fail(res, "occupied");
    }
    else
    { db.CreateRoom(req.body.room, req.sessionID);
      req.session.room = req.body.room;
      res.send({ status: "success",
                 room: req.body.room });
    }
  });

  app.delete('/api/rooms/:room', function api_deleteroom(req, res)
  { var owner = db.GetOwnerByRoomName(req.params.room);
    if (owner != /*TODO: CHANGE {*/req.sessionID/*}*/)
    { res.status(400);
      res.send({ status: "failure",
                 reason: "ownership" });
    }
    else
    { db.CloseRoom(req.params.room);
      req.session.room = "";
      res.send({ status: "success" });
    }
  });

  app.get('/api/rooms/:room/peer', function api_getpeer(req, res)
  { var peer = db.GetPeer(req.params.room);
    res.send({ status: "success",
               peer: peer });
  })

  app.put('/api/rooms/:room/peer', function api_setpeer(req, res)
  { if (!req.body.peer)
    { fail(res, "params", "no peer param");
    }
    else
    { var owner = db.GetOwnerByRoomName(req.params.room);
      if (owner != req.sessionID)
        fail(res, "ownership");
      else
      { db.SetPeer(req.params.room, req.body.peer);
        res.send({ status: "success" });
      }
    }
  });

  app.get('/api/rooms/:room/songs', function api_getsongs(req, res)
  { var songs = db.GetSongs(req.params.room);
    res.send({songs: songs});
  });

  app.post('/api/rooms/:room/songs', function api_addsong(req, res)
  { /*if (!req.body.song)
    { fail(res, "params", "no song param");
    }
    else*/
    { var songid = db.AddSong(req.params.room, req.body.song);
      res.send({songid: songid});
      // TODO: event listener for room, to send song list updates to clients
    }
  });
}

module.exports = { route: route,
                 }