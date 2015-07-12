// stdlib
var querystring = require('querystring');
// vendor
var express = require('express'),
    async   = require('async'),
    winston = require('winston');
// local
var models = require('../models'),
    Room = models.Room,
    User = models.User;

var router = module.exports = new express.Router();

router.use(function(req, res, next) {
  res.locals.user = req.session.user;
  next();
});

router.get('/', function view_index(req, res) {
  res.render('index');
});

var authenticate = function(req, res, next) {
  if (!req.session.user) {
    var qs = querystring.encode({ redirect: req.originalUrl });
    res.redirect("/login?" + qs);
  } else {
    next();
  }
}

router.route('/login')
.all(function (req, res, next) {
  if (req.session.user) {
    res.redirect(req.query.redirect || '/');
  } else {
    next();
  }
})
.get(function (req, res) {
  res.locals.redirect = req.query.redirect;
  res.render('login');
})
.post(function (req, res, next) {
  username = req.body.username;
  redirect = req.query.redirect;
  User.findOne({ username: username }, function(err, user) {
    if (err) next(err);
    else if (!user) {
      res.status(404).send();
    } else {
      req.session.user = user;
      req.session.save();
      res.redirect(redirect || '/');
    }
  });
});

var logout = function (req, res, next) {
  async.waterfall([
    function(callback) {
      Room.findOne({ host: req.session.user._id }, callback);
    },
    function(room, callback) {
      if (room) room.remove(callback);
      else callback();
    },
    function(callback) {
      delete req.session.user;
      delete req.session.room;
      req.session.save(callback);
    }
  ], function(err) {
    if (err) next(err);
    else res.redirect('/');
  });
}
router.route('/logout')
.get(logout)
.post(logout);

router.route('/:room')
.all(authenticate)
.get(function view_room(req, res, next) {
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