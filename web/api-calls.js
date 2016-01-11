var querystring = require('querystring');
var request = require('superagent');
var actions = require('./actions'),
    stores  = require('./stores');
    MODE    = require('shared').MODE;

// If you're used to the normal Flux/Reflux way of doing things, this file
// exists because I didn't want the app's http and WebRTC interactions to be
// defined in the datastores. That just feels dirty to me.
// Good modular code should be modularized by functionality, and each module
// should depend on other modules as little as possible.

var triggerAsyncResults = function(err, res) {
  if (err) {
    console.log('testing for real errors:', err);
    this.failed(err, res);
  } else {
    this.completed(res.status, res.body);
  }
};

actions.general.createRoom.listen(function(room) {
  // make a POST to /api/rooms with the contents of stores.room
  request.post('/api/rooms')
    .send(_.pick(room, 'name', 'pathtoken'))
    .end(triggerAsyncResults.bind(this));
});

actions.general.updateRoom.listen(function() {
  // make a PATCH to /api/rooms/:id
  var state = _.pick(stores.room.state, arguments);
  var endpoint = '/api/rooms/'+stores.room.state.id;
  var qs = querystring.encode({ key: stores.room.state.key });
  request.patch(endpoint + '?' + qs)
    .send(state)
    .end(triggerAsyncResults.bind(this));
});

actions.general.closeRoom.listen(function() {
  // make a DELETE to /api/rooms/:id
  var endpoint = '/api/rooms/'+stores.room.state.id;
  var qs = querystring.encode({ key: stores.room.state.key });
  request.delete(endpoint + '?' + qs)
    .end(triggerAsyncResults.bind(this));
});

actions.room.update.listen(function(update) {
  // update will either be called as a host from user interaction
  // or as a client from a pushed update from the host
  if (stores.auth.mode == MODE.HOST) {
    // make a PATCH to /api/rooms/:id
    var endpoint = '/api/rooms/'+stores.room.state.id;
    var filteredUpdate = _.pick(update, 'name', 'pathtoken', 'peer');
    var qs = querystring.encode({ key: stores.auth.credentials.key });
    console.log('sending room update:', update);
    request.patch(endpoint + '?' + qs)
      .send(filteredUpdate)
      .end(function(err, res) {
        if (err) {
          console.log('room update failed: ', res.status, res.body);
          actions.room.update.failed(err, res);
        } else {
          actions.room.update.completed(res.status, res.body);
        }
      });
  } else {
    // fake api call
    actions.room.update.completed(200, update);
  }
});

actions.room.update.completed.listen(function() {
  console.log('room update completed');
});
