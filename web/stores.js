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
          actions.general.roomCreated();
          _.assign(this.state, {
            mode: MODE.HOST,
            pathtoken: res.body.uri_token,
          });
          this.updateHistory();
          this.trigger();
        }
      }).bind(this));
  },

  onJoinRoom: function(password) {
    // ignore password for now
    // register with host
    this.state.mode = MODE.CLIENT;
    this.state.error = null;
    this.trigger();
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

var room = exports.room = Reflux.createStore({
  state: {
    id: null,
    pathtoken: null,
    name: null,
    key: null,
  },

  init: function() {
    this.listenTo(actions.general.roomCreated, this.onRoomCreated);
    this.load(JSON.parse(localStorage.room || '{}'));
  },

  load: function(state) {
    _.assign(this.state, _.pick(state, Object.keys(this.state)));
    this.trigger();
  },

  onRoomCreated: function(room) {
    this.load(room);
    localStorage.room = JSON.stringify(this.state);
  },
});

var playlist = exports.playlist = Reflux.createStore({
  state: [],

  init: function() {
  },
});

var queue = exports.queue = Reflux.createStore({
  state: [],

  init: function() {
  },
});
