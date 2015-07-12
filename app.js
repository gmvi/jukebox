// Patchwork
// peer-to-peer party-playlisting

var fs           = require('fs'),
    http         = require('http');

var jade         = require('jade'),
    express      = require('express'),
    bodyparser   = require('body-parser'),
    cookieparser = require('cookie-parser'),
    session      = require('express-session'),
    peer         = require('peer'),
    mongoose     = require('mongoose'),
    MongoStore   = require('connect-mongo')(session),
    winston      = require('winston'),
    expressWinston = require('express-winston');

global.config = require('./config');
global.config.port = global.config.port || 5001;
winston.level = 'debug'

mongoose.connect(global.config.dbURI);

winston.info('configuring app');

var app = module.exports = express();
var server = http.createServer(app);

var parseCookie = cookieparser();
var sessionStore = new MongoStore({ mongooseConnection: mongoose.connection });
var parseSession = session(
  { secret : global.config.sessionsecret,
    store  : sessionStore,
    resave : false,
    saveUninitialized : false
  });

app.set('views', __dirname + '/templates');
app.set('view engine', 'jade');

app.use(parseCookie);
app.use(parseSession);
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended:false}))

// static folders and files
app.use('/stylesheets', express.static(__dirname + '/stylesheets'));
app.use('/scripts',     express.static(__dirname + '/scripts'));
app.use('/assets',      express.static(__dirname + '/assets'));
// TODO: a smarter filter on this
app.use('/bower', express.static(__dirname + '/bower_components'));

app.use('/peerjs', peer.ExpressPeerServer(server));

// request logging
app.use(expressWinston.logger({
  transports: [
    new winston.transports.Console({
      colorize: true
    })
  ],
  meta: false,
  msg: "HTTP {{req.method}} {{req.url}}",
}));

app.use('/', require('./routes'));

app.use(function(req, res, next) {
  res.status(404).send('lolwut?');
});

app.use(expressWinston.errorLogger({
  transports: [
    new winston.transports.Console({
      json: true,
      colorize: true
    })
  ]
}));

server.listen(global.config.port, function(err) {
  if (err) throw err;
  winston.info("listening on port", global.config.port);
});