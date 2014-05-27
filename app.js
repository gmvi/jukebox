// Patchwork
// peer-to-peer party-playlisting

var fs            = require('fs'),
    http          = require('http'),
    jade          = require('jade'),
    express       = require('express'),
    BodyParser    = require('body-parser'),
    CookieParser  = require('cookie-parser'),
    SessionParser = require('express-session'),
    PeerServer    = require('peer').PeerServer/*,
    MongoStore    = require('connect-mongo')(session)*/;

var settings;
if (fs.existsSync(__dirname + "/settings.json"))
{ settings = require("./settings.json");
}
else
{ console.info("Warning: using default settings file");
  settings = require("./settings-default.json");
}

var app = express();
var server = http.createServer(app);
//TODO: mount PeerServer on /peer instead of a seperate port
peerserver = new PeerServer({path: '/peer'});

app.set('views', __dirname + '/templates');

/*var sessionStore;
if (settings.debug)
  sessionStore = undefined;
else
  sessionStore = new MongoStore({db: settings.db});*/

//app.use(express.logger());
app.use(BodyParser());
app.use(CookieParser());
app.use(SessionParser({ secret: settings['session secret'],
                        name: 'sid'/*,
                        store:  sessionStore*/
                      }));

// static folders and files
app.use('/stylesheets', express.static(__dirname + '/stylesheets')); // local css
app.use('/scripts', express.static(__dirname + '/scripts')); // local js
app.use('/assets', express.static(__dirname + '/assets')); // images etc
app.use('/bower', express.static(__dirname + '/bower_components')); // bower components

/** database interaction for now **/
db = require('./db.js');

app.get('/api/rooms/:room', function api_checkroom(req, res)
{ var owner = db.CheckRoom(req.params.room);
  res.send({"owner": owner});
});

app.post('/api/rooms', function api_createroom(req, res)
{ function fail(reason, details)
  { res.send({ status: "failure",
               reason: reason,
               details: details });
  }
  if (!req.body.room)
  { fail("params", "no room param");
  }
  else if (req.session.room)
  { fail("multiple", "close other room and try again");
  }
  else
  { var owner = db.CheckRoom(req.body.room);
    if (owner)
    { res.send({ status: "failure",
                 reason: "room occupied" });
    }
    else
    { db.CreateRoom(req.body.room, req.sessionID);
      req.session.room = req.body.room;
      res.send({ status: "success",
                 room: req.body.room });
    }
  }
});

app.delete('/api/rooms/:room', function api_deleteroom(req, res)
{ var owner = db.CheckRoom(req.params.room);
  if (owner == req.sessionID)
  { db.CloseRoom(req.params.room);
    req.session.room = "";
    res.send({ status: "success" });
  }
  else
  { res.send({ status: "failure",
               reason: "ownership" });
  }
});

app.get('/api/rooms/:room/peer', function api_getpeer(req, res)
{ res.send({ status: "success",
             peer: db.GetPeer(req.params.room)});
})

app.put('/api/rooms/:room/peer', function api_setpeer(req, res)
{ function fail(reason, details)
  { res.send({ status: "failure",
               reason: reason,
               details: details });
  }
  if (!req.body.peer)
    fail("params", "no peer param");
  else
  { var owner = db.CheckRoom(req.params.room);
    if (owner == req.sessionID)
    { db.SetPeer(req.params.room, req.body.peer);
      res.send({ status: "success" });
    }
    else
      fail("ownership");
  }
});

function render(res, view, vars)
{ res.render(view, vars, function(err, html)
  { if (err) throw err;
    res.send(html);
  });
}

app.get('/', function view_index(req, res)
{ var vars = { rooms: db.GetRooms().slice(0, 5),
               userRoom: req.session.room
             };
  render(res, 'index.jade', vars);
});

app.get('/:room', function view_room(req, res)
{ var room = req.params.room;
  var owner = db.CheckRoom(room);
  if (owner == req.sessionID)
    render(res, 'room_admin.jade', { room: room,
                                     songs: db.GetSongs(room) });
  else if (owner)
  { render(res, 'room_user.jade', { room: room,
                                    songs: db.GetSongs(room) });
  }
  else
    render(res, 'room_not_found.jade', { room: room });
});

server.listen(process.env.PORT || settings['port']);