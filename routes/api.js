var express = require('express'),
    models = require('../models');
var Room = models.Room;

var router = module.exports = new express.Router();

function fail(res, reason, details, status) {
  if (typeof details == 'number' && status === undefined) {
    status = details;
    details = undefined;
  }
  res.status(status || 400)
     .send({ status: "failure",
             reason: reason,
             details: details });
}

var authenticate = function(req, res, next) {
  if (!req.session.user) {
    console.log(req.session.user);
    fail(res, 'unauthenticated', 401);
  } else {
    next();
  }
}

router.get('/rooms/:room', function api_checkroom(req, res, next) {
  Room.findOne({name: req.params.room}, function(err, room) {
    if (err || !room) {
      next(err);
    } else {
      res.send({ "name": room.name,
                 "host": room.host });
    }
  });
});

router.post('/rooms', authenticate, function api_createroom(req, res, next) {
  if (!req.body.room) {
    fail(res, "params", "room");
  } else if (!req.body.host) {
    fail(res, "params", "host");
  } else if (req.session.room) {
    fail(res, "multiple");
  } else {
    Room.findOne({name: req.params.room}, function(err, room) {
      if (err) next(err);
      else if (room) {
        fail(res, "occupied");
      } else {
        var room = new Room({name: req.body.room, host: req.body.host});
        room.save(function(err) {
          if (err) next(err);
          else {
            req.session.room = req.body.room;
            res.send({ status : "success",
                       room   : req.body.room });
          }
        });
      }
    });
  }
});

router.get('/my_room', authenticate, function(req, res, next) {
  if (req.session.room) res.json({name:req.session.room});
  else res.json(null);
});

router.post('/close_room', authenticate, function api_deleteroom(req, res, next) {
  // idempotency
  if (!req.session.room) return res.send({ status: "success" });
  Room.findOne({name: req.session.room}, function(err, room)
  { if (err) next(err);
    else if (!room) {
      // wat?
      console.warn("failed to find room on delete");
      req.session.room = "";
      res.send({ status: "success" });
    } else {
      room.remove(function(err) {
        if (err) next(err);
        else {
          req.session.room = "";
          res.send({ status: "success" });
        }
      });
    }
  });
});