var express = require('express'),
    peer    = require('peer');

var router = module.exports = new express.Router();

// app.use(function queryparser_wtf(req, res, next)
// { if (typeof req.query === 'object')
//     return next();
//   query = req.query();
//   if (typeof query === 'object')
//     return next();
//   req.query = {};
//   if (query.indexOf("&") != -1)
//   { query = query.split("&");
//     for (var i; i < query.length; i++)
//     { var pair = query[i].split("=");
//       if (pair[0])
//         req.query[pair[0]] = pair[1] || true;
//     }
//   } else if (query.indexOf(";") != -1)
//   { query = query.split(";");
//     for (var i; i < query.length; i++)
//     { var pair = query[i].split(":");
//       if (pair[0])
//         req.query[pair[0]] = pair[1] || true;
//     }
//   } else
//   { var pair = query.split("=");
//     if (pair.length == 1)
//       pair = query.split(":");
//     req.query[pair[0]] = pair[1] || true;
//   }
//   next();
// });

router.param("room", function(req, res, next, room)
{ res.locals.room = room;
  next();
});

router.use('/api', require('./api.js'));
router.use('/', require('./main.js'));
