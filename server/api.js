var _       = require('lodash'),
    crypto  = require('crypto'),
    express = require('express'),
    winston = require('winston');
var models = require('./models');
var Room = models.Room;

var router = module.exports = new express.Router();

router.get('/rooms', function(req, res) {
  res.sendStatus(501);
});

var knexErrorUniqueSplit = 'SQLITE_CONSTRAINT: UNIQUE constraint failed: ';

router.post('/rooms', function(req, res, next) {
  Room.validateURIToken(req.body.uri_token).then(function() {
    var key = crypto.randomBytes(36).toString('base64');
    var room = new Room({
      name: req.body.name,
      key: key,
      uri_token: req.body.uri_token,
      peer: req.body.peer
    });
    room.save().then(function(room) {
      var resp = room.serializePrivate();
      res.status(201).json(resp);
    }, function(err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        var s = err.message.split(knexErrorUniqueSplit);
        if (s.length == 2) {
          res.status(400).json({
            "attribute": s[1].split('.')[1],
            "reason": "duplicate"
          });
          return;
        }
      }
      // unknown database error
      next(err);
    });
  }, function(err) {
    // uri_token error
    res.status(400).json({
      "attribute": "uri_token",
      "reason": err.message
    });
  });
});

router.get('/rooms/:id', function(req, res) {
  Room.where('id', req.params.id)
      .fetch()
      .then(function(room) {
        if (room == null) {
          res.sendStatus(404);
        } else {
          var resp = room.serializePublic();
          res.json(resp);
        }
      });
});

var f = function(req, res, next) {
  Room.where({ id: req.params.id })
      .fetch()
      .then(function(room) {
        if (room == null) {
          res.sendStatus(404);
          return;
        }
        if (req.body.key != room.get('key')) {
          res.sendStatus(403).json({
            attribute: 'key'
          });
          return;
        }
        Room.sanitizeURIToken(req.body.uri_token).then(function(uri_token) {
          var update = _.pick(req.body, ['name', 'peer']);
          if (uri_token != null) update.uri_token = uri_token;
          room.save(update).then(function(room) {
            res.json(room.serializePrivate());
          }, function(err) {
            if (err.code === 'SQLITE_CONSTRAINT') {
              var s = err.message.split(knexErrorUniqueSplit);
              if (s.length == 2) {
                res.status(400).json({
                  "attribute": s[1].split('.')[1],
                  "reason": "duplicate"
                });
                return;
              }
            }
            // unknown database error
            next(err);
          });
        }, function(err) {
          res.status(400).json({
            attribute: 'uri_token',
            reason: err.message
          });
        });
      });
}
router.put('/rooms/:id', f);
router.patch('/rooms/:id', f);

router.delete('/rooms/:id', function(req, res, next) {
  Room.where({ id: req.params.id })
      .fetch()
      .then(function(room) {
        if (room == null) {
          res.sendStatus(404);
          return;
        }
        if (req.body.key != room.get('key')) {
          res.sendStatus(403).json({
            attribute: 'key'
          });
          return;
        }
        room.destroy().then(function(empty) {
          res.sendStatus(204);
        }, next);
      });
});
