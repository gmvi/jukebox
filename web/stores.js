var _       = require('lodash'),
    Reflux  = require('reflux'),
    request = require('superagent');

var actions = require('./actions'),
    peer    = require('./peer'),
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

var localStorageMixin = function(attr) {
  return {
    load: function(state) {
      if (state == undefined) {
        var stored = localStorage[attr]; // will be a string or undefined
        // but if 'undefined' or 'null' is stored, there's probably a bug on the
        // write side
        if (stored == 'undefined' || stored == 'null') {
          throw new Error('invalid representation found in localStorage: ' +
                          stored);
        } else if (stored != undefined) {
          this.load(JSON.parse(stored));
        }
      } else {
        if (_.isArray(this.state)) {
          this.state = state.slice();
        } else if (_.isObject(this.state)) {
          Object.keys(this.state).forEach(function(key) {
            this.state[key] = state[key];
          }, this);
        } else {
          this.state = state;
        }
      }
      this.trigger();
    },
    dump: function() {
      localStorage[attr] = JSON.stringify(this.state);
    },
  };
};

var room = exports.room = Reflux.createStore({
  mixins: [localStorageMixin('room')],
  state: {
    id: null,
    pathtoken: null,
    name: null,
    key: null,
    peer: null,
  },

  init: function() {
    this.listenTo(actions.general.roomCreated, this.onRoomCreated);
    this.load();
  },

  onRoomCreated: function(room) {
    this.load(room);
    this.dump();
  },
});

var player = exports.player = Reflux.createStore({
  mixins: [localStorageMixin('player')],
  state: {
    playing: false,
    isSpotify: null,
    pointer: null,
  },

  init: function() {
    this.load();
    this.playing = false;
  },
});

var playlist = exports.playlist = Reflux.createStore({
  mixins: [localStorageMixin('playlist')],

  state: [ { id: 0, track: 'Track 1', album: 'Example Album', artist: 'Example Artist', art: null, token: null, }, { id: 1, track: 'Track 2', album: 'Example Album', artist: 'Example Artist', art: null, token: null, }, { id: 2, track: 'Track 3', album: 'Example Album', artist: 'Example Artist', art: null, token: null, }, { id: 3, track: 'Track 4', album: 'Example Album', artist: 'Example Artist', art: null, token: null, }, { id: 4, track: 'Track 5', album: 'Example Album', artist: 'Example Artist', art: null, token: null, }, { id: 5, track: 'Track 6', album: 'Example Album', artist: 'Example Artist', art: null, token: null, }, ],

  init: function() {
    // this.load();
  },

});

var queue = exports.queue = Reflux.createStore({
  mixins: [localStorageMixin('queue')],

  state: [ { id: 0 }, ],

  init: function() {
    // this.load();
  },
});
