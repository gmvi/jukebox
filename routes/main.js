// stdlib
var querystring = require('querystring');
// vendor
var express = require('express');
// local
var models = require('../models'),
    Room = models.Room;

var router = module.exports = new express.Router();

router.use(function(req, res, next) {
  res.locals.user = req.session.user;
  next();
});

router.get('/', function view_index(req, res) {
  res.render('index');
});

USERS = {
  a: { username: 'a', name: 'Test User A' },
  b: { username: 'b', name: 'Test User B' },
  c: { username: 'c', name: 'Test User C' },
  d: { username: 'd', name: 'Test User D' }
}

var authenticated = function(req, res, next) {
  if (!req.session.user) {
    var qs = querystring.encode({ redirect: req.originalUrl });
    console.log(redirect);
    res.redirect("/login?" + redirect);
  } else {
    next();
  }
}

router.route('/login')
.get(function (req, res) {
  res.locals.redirect = req.query.redirect;
  res.render('login');
})
.post(function (req, res) {
  user = req.body.user;
  redirect = req.body.redirect;
  if (user in USERS) {
    req.session.user = USERS[user];
    req.session.save();
    res.redirect(redirect || '/');
  } else {
    var qs = { err: 'George, stop breaking your app!' };
    if (redirect) qs.redirect = redirect;
    res.redirect('/login?'+querystring.encode(qs));
  }
});

var logout = function (req, res) {
  Room.findOne({name: req.session.room}, function(err, room) {
    if (err) next(err);
    else room.remove(function(err) {
      if (err) next(err);
      else {
        delete req.session.user;
        delete req.session.room;
        req.session.save();
        res.redirect('/');
      }
    });
  });
}
router.route('/logout')
.get(logout)
.post(logout);

router.route('/:room')
.all(authenticated)
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