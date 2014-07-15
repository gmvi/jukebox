var app = require('../app.js');
var db = require('../db.js');

app.param("room", function(req, res, next, room)
{ res.locals.room = res.room = room;
  next();
});

require('./api.js');
require('./main.js');

app.use(function(req, res, next) {
  res.send(404, 'lolwut?');
});
