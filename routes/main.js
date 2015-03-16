var express = require('express');

var models = require('../models');
var Room = models.Room;

var router = module.exports = new express.Router();

router.get('/', function view_index(req, res) {
  res.render('index');
});

router.get('/:room', function view_room(req, res, next) {
  Room.findOne({name: req.params.room}, function (err, room) {
    if (err || !room) next(err);
    else {
      res.locals.my_room = req.session.room;
      res.locals.host = room.host;
      res.locals.admin = room.name == req.session.room
      res.render('room');
    }
  });
});