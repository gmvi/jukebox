// Patchwork
// peer-to-peer party-playlisting

var fs           = require('fs'),
    http         = require('http'),
    jade         = require(  'jade'),
    peer         = require(    'peer'),
    express      = require(   'express'),
    bodyparser   = require( 'body-parser'),
    cookieparser = require( 'cookie-parser'),
    session      = require( 'express-session')/*,
    MongoStore   = require('connect-mongo')(session)*/;

var db  = require('./db.js'),
    api = require('./api.js');

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
// The two servers don't collide?? I guess they both use the http module and
//   are really just one server.
peerserver = new peer.PeerServer({port: 5002});

app.set('views', __dirname + '/templates');

/*var sessionStore;
if (settings.debug)
  sessionStore = undefined;
else
  sessionStore = new MongoStore({db: settings.db});*/

//app.use(express.logger());
app.use(bodyparser()); // for POST url-encoded data
app.use(cookieparser());
app.use(session({ secret: settings['session secret'],
                  name: 'sid'/*,
                  store:  sessionStore*/
                }));

// static folders and files
function use_static(external, internal)
{ app.use(external, express.static(__dirname + (internal || external)));
}
use_static('/stylesheets');
use_static('/scripts');
use_static('/assets');
use_static('/bower', '/bower_components');

api.route(app, db);

/*here*/
function render(res, view, vars)
{ res.render(view, vars, function(err, html)
  { if (err) throw err;
    res.send(html);
  });
}

app.get('/', function view_index(req, res)
{ var vars = { rooms: db.GetRooms(5),
               userRoom: req.session.room
             };
  render(res, 'index.jade', vars);
});

app.get('/:room', function view_room(req, res)
{ var room = req.params.room;
  try
  { var owner = db.GetOwnerByRoomName(room);
  }
  catch (e)
  { res.status(404);
    render(res, 'room_not_found.jade', { room: room });
    return;
  }
  if (owner == req.sessionID)
    render(res, 'room_admin.jade', { room: room,
                                     songs: db.GetSongs(room) });
  else if (owner)
    render(res, 'room_user.jade', { room: room,
                                    songs: db.GetSongs(room) });
});

app.use(function(req, res, next){
  res.send(404, 'lolwut?');
});

server.listen(process.env.PORT || settings['port']);