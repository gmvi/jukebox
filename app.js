// Patchwork
// peer-to-peer party-playlisting

var fs           = require('fs'),
    http         = require('http'),
    jade         = require('jade'),
    express      = require('express'),
    bodyparser   = require('body-parser'),
    cookieparser = require('cookie-parser'),
    session      = require('express-session'),
    MongoStore   = require('connect-mongo')(session);

var MemoryStore  = session.MemoryStore;

var settings;
if (fs.existsSync(__dirname + "/settings.json"))
{ settings = require("./settings.json");
}
else
{ console.info("Warning: using default settings file");
  settings = require("./settings-default.json");
}

var dbcontroller = require('./db.js');

var parseCookie = cookieparser();

var sessionStore;
if (!settings.debug)
  sessionStore = new MongoStore({ db: database });
else
  sessionStore = new MemoryStore();
var parseSession = session({ secret : settings.sessionsecret,
                             key    : 'sid',
                             store  : sessionStore
                           });

var parseBody = bodyparser(); // for POST url-encoded data

var app = module.exports = express();
var server = http.createServer(app);
require("./peerserver")(dbcontroller);

app.set('views', __dirname + '/templates');
app.set('view engine', 'jade');

//app.use(express.logger());
app.use(parseCookie);
app.use(parseSession);
app.use(parseBody);

// static folders and files
app.use('/stylesheets', express.static(__dirname + '/stylesheets'));
app.use('/scripts',     express.static(__dirname + '/scripts'));
app.use('/assets',      express.static(__dirname + '/assets'));
app.use('/bower',       express.static(__dirname + '/bower_components'));

//TODO: put db on a prototype
app.use(function custom_env_tweaks(req, res, next){
  req.db = dbcontroller;
  next();
});

require('./routes');

console.log("Starting server");
server.listen(process.env.PORT || 5001);