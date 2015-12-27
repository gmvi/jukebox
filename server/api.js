var crypto      = require('crypto'),
    querystring = require('querystring');
var _       = require('lodash'),
    express = require('express'),
    request = require('superagent'),
    winston = require('winston'),
    oboe    = require('oboe');
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

var streamingEdit = function(url, out, path, transform) {
  out.write('[');
  var first = true;
  oboe(url).node(path, function(track) {
    transform(track, function(transformed) {
      if (!first) out.write(',');
      else first = false;
      out.write(JSON.stringify(transformed));
    });
  }).done(function() {
    out.write(']');
    out.end();
  });
}

router.get('/search/soundcloud', function(req, res, next) {
  if (!req.query.q) {
    res.send([]);
  } else {
    res.setHeader('Content-Type', 'application/json');
    var qs = querystring.encode({
      client_id: global.config.searchTokens.soundcloud,
      q: req.query.q,
      limit: 20,
    });
    var url = 'http://api.soundcloud.com/tracks/?' + qs;
    streamingEdit(url, res, '*', function(track, write) {
      if (track.streamable) {
        var art = track.artwork_url
                ? track.artwork_url.replace(/large/, 'small')
                : null;
        write({
          id: track.id,
          track: track.title,
          artist: track.user.username,
          art: art,
        });
      }
    });
  }
});

router.get('/search/youtube', function(req, res, next) {
  if (!req.query.q) {
    res.send([]);
  } else {
    res.setHeader('Content-Type', 'application/json');
    var qs = querystring.encode({
      key: global.config.searchTokens.youtube,
      type: 'video',
      part: 'snippet',
      q: req.query.q,
      maxResults: 20,
    });
    var url = 'https://www.googleapis.com/youtube/v3/search?' + qs;
    streamingEdit(url, res, 'items.*', function(result, write) {
      write({
        id: result.id.videoId,
        track: result.snippet.title,
        art: result.snippet.thumbnails.default.url,
      });
    });
  }
});

router.get('/search/spotify', function(req, res, next) {
  if (!req.query.q) {
    res.send([]);
  } else {
    res.setHeader('Content-Type', 'application/json');
    var qs = querystring.encode({
      q: req.query.q,
      type: 'track',
      market: 'US',
      limit: 20,
    });
    var url = 'https://api.spotify.com/v1/search?' + qs;
    streamingEdit(url, res, 'tracks.items.*', function(result, write) {
      write({
        id: result.id,
        track: result.name,
        album: result.album.name,
        artist: result.artists[0].name,
        art: result.album.images[result.album.images.length-1].url,
      });
    });
  }
});
