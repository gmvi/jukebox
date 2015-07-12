var _ = require('lodash'),
    express = require('express'),
    winston = require('winston'),
    models = require('../models');
var Room = models.Room,
    User = models.User;

var router = module.exports = new express.Router();

var reservedNames = ['login', 'logout', 'api',
                     'about', 'faq', 'help', 'contact'];

function fail(res, reason, details, status) {
  if (typeof details == 'number' && status === undefined) {
    status = details;
    details = undefined;
  }
  res.status(status || 400)
     .json({ reason: reason,
             details: details });
}

var authenticate = function(req, res, next) {
  if (!req.session.user) {
    fail(res, 'unauthenticated', 401);
  } else {
    next();
  }
}

var roomToJSON = function(room) {
  return {
    'name': room.name,
    'host': { 
      '_id': room.host._id,
      'peerid': room.host.peerid,
    },
  };
}

// GET /rooms/:room returns room data if the room is found, including host's peerid
router.get('/rooms/:room', function api_checkroom(req, res, next) {
  var query = Room.findOne({name: req.params.room});
  query.exec(function(err, room) {
    console.log(room);
    if (err) {
      next(err);
    } else if (!room) {
      fail(res, 'not found', 404);
    } else {
      res.json(roomToJSON(room));
    }
  });
});

router.post('/rooms', authenticate, function api_createroom(req, res, next) {
  var roomName = req.body.room;
  if (!roomName) {
    fail(res, 'params', 'room');
  } else if (roomName in reservedNames) {
    fail(res, 'reserved');
  } else {
    async.waterfall([
      function(callback) {
        Room.findOne({ host: req.session.user._id }, callback);
      },
      function(room, callback) {
        if (room) fail(res, 'multiple');
        else callback();
      },
      function(callback) {
        Room.findOne({ name: roomName }, callback);
      },
      function(room, callback) {
        if (room) {
          fail(res, 'occupied');
        } else {
          var room = new Room({ name: roomName, host: req.session.user._id });
          room.save(callback);
        }
      }
    ], function(err) {
      if (err) next(err);
      else res.status(200).end();
    });
  }
});

router.get('/my_room', authenticate, function(req, res, next) {
  Room.findOne({ host: req.session.user._id }, function(err, room) {
    if (err) next(err);
    else if (room) {
      res.json(roomToJSON(room))
    } else {
      res.json(null);
    }
  });
});

router.delete('/my_room', authenticate, function api_deleteroom(req, res, next) {
  console.log('entered route');
  Room.findOne({ host: req.session.user._id }, function(err, room) {
    if (err) next(err);
    else if (!room) {
      // idempotency
      req.session.room = '';
      res.json({ status: 'success' });
    } else {
      room.remove(function(err) {
        if (err) next(err);
        else {
          req.session.room = '';
          res.json({ status: 'success' });
        }
      });
    }
  });
});

router.post('/peerid', function(req, res) {
  if (!req.body.peerid) {
    fail(res, 'params', 'peerid');
  } else {
    console.log('asdf');
  }
});

router.get('/dev/reset', function(req, res, next) {
  Room.collection.remove(function(err) {
    if (err) next(err);
    else {
      winston.debug("resetting rooms");
      res.redirect('/');
    }
  });
});