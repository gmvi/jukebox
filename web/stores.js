var _       = require('lodash'),
    Reflux  = require('reflux'),
    request = require('superagent');

var actions = require('./actions'),
    strings = require('./strings'),
    utils   = require('shared'),
    MODE    = utils.MODE;

var general = exports.general = Reflux.createStore({
  listenables: [actions.general],
  state: {
    mode: null,
    pathtoken: null,
    roomid: null,
    roomname: null,
    roomkey: null,
    error: null,
  },

  getInitialState: function() {
    return this.state;
  },

  // init pulls the initial state from window.vars, which should have been set
  // in a <script> tag included in the header.
  init: function() {
    // sanity check that window.vars.mode is a member of the MODE enum
    if (window.vars.mode && MODE.has(window.vars.mode)) {
      this.state.mode = window.vars.mode;
    } else if (window.location.pathname != '/') {
      // if this happens, the server is violating spec :(
      // let's hope the landing page is more stable?
      window.location = '/';
    } else {
      this.state.mode = MODE.ERROR;
    }
    this.state.pathtoken = window.location.pathname.slice(1);
    window.onpopstate = function(evt) {
      _.assign(this.state, evt.state);
      this.trigger();
    }
  },

  updateHistory: function() {
    history.pushState(
      this.state,
      "Peertable: "+this.state.name,
      '/'+this.state.pathtoken
    );
    console.log('pushed state:', this.state.pathtoken);
  },

  onCreateRoom: function(room) {
    request.post('/api/rooms')
      .send({ uri_token: room.pathtoken, name: room.name })
      .set('Accept', 'application/json')
      .end((function(err, res) {
        if (err) {
          actions.general.handleError('createRoom', res);
        } else {
          actions.general.clearError();
          _.assign(this.state, {
            mode: MODE.HOST,
            pathtoken: res.body.uri_token,
            roomid: res.body.id,
            roomname: res.body.name,
            roomkey: res.body.key,
          });
          this.updateHistory();
          this.trigger();
        }
      }).bind(this));
  },

  onHandleError: function(context, res) {
    if (res.status >= 500) {
      this.state.error = strings.ERROR_SERVER_FAILURE;
      return this.trigger();
    }
    switch (context) {
      case 'createRoom':
        if (res.status == 400 && res.body.attribute == 'uri_token') {
          switch (res.body.reason) {
            case 'duplicate':
              this.state.error = strings.TOOLTIP_PATHTOKEN_DUPLICATE;
              return this.trigger();
            case 'invalid':
              this.state.error = strings.TOOLTIP_PATHTOKEN_INVALID;
              return this.trigger();
          }
        }
    }
    this.state.error = strings.ERROR_UNKNOWN;
    this.trigger();
  },

  onClearError: function() {
    this.state.error = null;
    this.trigger();
  },
});

exports.create = Reflux.createStore({
  listenables: [actions.create],
  state: { 
    name: 'Example Room Name!', 
    pathtoken: 'example-room-name',
    password: 'correct horse battery staple', 
    autoPathtoken: true, 
    valid: true, 
  },

  getInitialState: function() {
    return this.state;
  },

  onVerify: function(pathtoken) {
    pathtoken = utils.sanitizePathtoken(pathtoken);
    request.get('/api/rooms/'+pathtoken, function(err, res) {
      console.log(err, res);
    });
  },

});
