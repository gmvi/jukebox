var request = require('superagent');
var actions = require('./actions'),
    stores  = require('./stores');

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
    this.completed(res);
  }
};

actions.general.createRoom.listen(function(room) {
  // make a POST to /api/rooms with the contents of stores.room
  request.post('/api/rooms')
    .send(_.pick(room, 'name', 'pathtoken', 'password'))
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
