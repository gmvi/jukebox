var _       = require('lodash'),
    Reflux  = require('reflux'),
    request = require('superagent');

var actions   = require('./actions'),
    transport = require('./transport'),
    strings   = require('./strings'),
    utils     = require('shared'),
    MODE      = utils.MODE;

var storage = null;

// Events:
//   storage/{key}     emitted on storage events
//   namespace-change  emitted when the namespace has changed
var emitter = new EventEmitter();

var stateMixin = {
  getInitialState: function() {
    return this.state;
  },
  setState: function(newState) {
    Object.keys(this.state).forEach(function(key) {
      this.state[key] = newState[key];
    }, this);
    this.trigger();
  },
};

var localStorageMixin = function(key) {
  return {
    init: function() {
      emitter.on('namespace-change', function() {
        this.load();
        emitter.on('storage/'+key, function(e) {
          this.setState(JSON.parse(e.newValue));
        }, this);
      }, this);
    },
    load: function() {
      var value = storage.getItem(key); // will be a string or null
      // but if 'undefined' or 'null' is stored, there's probably a bug on
      // the write side
      if (value === null) {
        // nothing to load
        return;
      } else if (value === 'undefined' || value === 'null') {
        throw new Error('invalid representation found in localStorage: ' +
                        value);
      } else {
        this.setState(JSON.parse(value));
      }
    },
    dump: function() {
      localStorage.setItem(JSON.stringify(this.state));
    },
  };
};

var general = exports.general = Reflux.createStore({
  mixins: [stateMixin],
  listenables: [actions.general, actions.peer],
  state: {
    mode: null,
    pathtoken: null,
    error: null,
  },

  // init pulls the initial state from window.vars, which should have been set
  // in a <script> tag included in the header.
  init: function() {
    // sanity check that window.vars.mode is a member of the MODE enum
    if (window.vars.mode && MODE.has(window.vars.mode)) {
      this.setState({ mode: window.vars.mode });
    } else {
      // if this happens, the server is violating spec :(
      this.setState({ mode: MODE.ERROR });
    }
    this.setState({ pathtoken: window.location.pathname.slice(1) });
    window.onpopstate = function(evt) {
      this.setState(evt.state);
    };
  },

  onPeerEstablished: function(id) {
    if (this.state.mode === MODE.HOST) {
        actions.peer.initHost();
    } else if (this.state.mode === MODE.CLIENT) {
        actions.peer.initClient();
    }
  },

  updateHistory: function() {
    history.pushState(
      this.state,
      "Peertable: "+this.state.name, // title
      '/'+this.state.pathtoken // pathname
    );
    console.log('pushed state for', this.state.pathtoken);
  },

  onCreateRoomFailed: function(err, res) {
    console.log('pretend tooltip');
    actions.general.handleError('createRoom', res);
  },

  onCreateRoomCompleted: function(res) {
    actions.general.clearError();
    this.setState({
      mode: MODE.HOST,
      pathtoken: res.body.pathtoken,
    });
    this.updateHistory();
    actions.peer.initHost();
  },
  
  onJoinRoomFailed: function() {
    console.log('pretend tooltip');
    actions.general.handleError('joinRoom', res);
  },

  onJoinRoomCompleted: function() {
    // register with host
    this.setState({
      mode: MODE.CLIENT,
      error: null,
    });
    actions.peer.initClient();
  },

  // this error handling is terrible
  onHandleError: function(context, res) {
    if (res.status >= 500) {
      this.state.error = strings.ERROR_SERVER_FAILURE;
      return this.trigger();
    }
    switch (context) {
      case 'createRoom':
        if (res.status == 400 && res.body.attribute == 'pathtoken') {
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

var auth = exports.auth = Reflux.createStore({
  mixins: [localStorageMixin('auth')],
  listenables: [actions.general],
  state: {},

  init: function() {
  },

  // maybe let's store host auths differently? force one-host-per-browser by
  // design? TODO
  onCreateRoomCompleted: function(res) {
    this.state = _.pick(res.body, 'key');
  },

  onJoinRoomCompleted: function(response) {
    if (response.clientId) {
      this.state = _.pick(response, 'clientId', 'clientSecret');
    }
  },
});

var room = exports.room = Reflux.createStore({
  mixins: [stateMixin],
  listenables: [actions.general],
  state: {
    id: null,
    pathtoken: null,
    key: null,
    password: null,
    name: null,
    peer: null,
  },

  onCreateRoomCompleted: function(res) {
    this.setState(res.body);
    if (storage) storage.destroy();
    storage = new NamespacedStorage(id);
    emitter.emit('namespace-change');
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
