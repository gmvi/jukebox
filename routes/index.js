var app = require('../app.js');
var db = require('../db.js');

app.use(function(req, res, next) {
  if (req.session.room) {
    res.locals.userRoom = req.session.room;
  }
  if (typeof req.query === 'object')
    return next();
  query = req.query();
  if (typeof query === 'object')
    return next();
  req.query = {};
  if (query.indexOf("&") != -1)
  { query = query.split("&");
    for (var i; i < query.length; i++)
    { var pair = query[i].split("=");
      if (pair[0])
        req.query[pair[0]] = pair[1] || true;
    }
  } else if (query.indexOf(";") != -1)
  { query = query.split(";");
    for (var i; i < query.length; i++)
    { var pair = query[i].split(":");
      if (pair[0])
        req.query[pair[0]] = pair[1] || true;
    }
  } else
  { var pair = query.split("=");
    if (pair.length == 1)
      pair = query.split(":");
    req.query[pair[0]] = pair[1] || true;
  }
  next();
});

app.param("room", function(req, res, next, room)
{ res.locals.room = res.room = room;
  next();
});

require('./api.js');
require('./main.js');

app.use(function(req, res, next) {
  res.send(404, 'lolwut?');
});
