var _            = require('lodash'),
    Reflux       = require('reflux'),
    request      = require('superagent'),
    EventEmitter = require('eventemitter3');

var actions   = require('./actions'),
    transport = require('./transport'),
    strings   = require('./strings'),
    utils     = require('shared'),
    MODE      = utils.MODE;
var NamespacedStorage = require('./storage');

// contains the namespaced localStorage wrapper
var storage = null;
// Events:
//   storage/{key}  emitted on storage events
var emitter = new EventEmitter();

var stateMixin = {
  getInitialState: function() {
    return this.state;
  },
  setState: function(newState) {
    Object.keys(this.state).forEach(function(key) {
      if (!_.isUndefined(newState[key])) {
        this.state[key] = newState[key];
      }
    }, this);
    this.trigger();
  },
};

var localStorageMixin = function(key) {
  return {
    init: function() {
      emitter.on('namespace-change', function() {
        this.load();
      }, this);
      emitter.on('storage/'+key, function(e) {
        this.setState(JSON.parse(e.newValue));
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

// The stores.
// Everything depends on room, so that loads first.
var room = exports.room = Reflux.createStore({
  mixins: [stateMixin],
  listenables: [actions.general],
  state: {
    id: null,
    pathtoken: null,
    password: null,
    name: null,
    peer: null,
  },

  init: function() {
    if (window.vars && window.vars.room) {
      this.setState(window.vars.room);
    }
    if (this.state.id) {
      console.log('loaded room.id:', this.state.id);
      // load the Storage device for the room once id is set
      storage = new NamespacedStorage(this.state.id);
      emitter.emit('room-established');
    }
  },

  onCreateRoomCompleted: function(res) {
    this.setState(res.body);
    // load the Storage device for the room once id is set
    storage = new NamespacedStorage(res.body.id);
    emitter.emit('room-established');
  },

  onJoinRoomAsHostCompleted: function() {
  },

  onJoinRoomAsClientCompleted: function() {
  },
});


var general = exports.general = Reflux.createStore({
  mixins: [stateMixin],
  listenables: [actions.general],
  state: {
    mode: null,
    peerId: null,
    pathtoken: null,
    error: null,
  },

  init: function() {
    if (!window.vars) {
      console.error('no global vars set');
      return;
    }
    if (window.vars.mode === MODE.CREATE) {
      console.log('setting mode from window.vars: CREATE');
      this.setState({mode: MODE.CREATE});
    } else if (window.vars.mode === MODE.JOIN) {
      console.log('setting mode from window.vars: JOIN');
      this.setState({mode: MODE.JOIN});
    } else {
      console.log('invalid mode in window.vars');
      this.setState({mode: MODE.ERROR});
    }
    this.setState({pathtoken: window.location.pathname.slice(1)});
    window.onpopstate = function(evt) {
      this.setState(evt.state);
    };
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
    this.setState({
      mode: MODE.HOST,
      pathtoken: res.body.pathtoken,
      error: null,
    });
    this.updateHistory();
  },

  onJoinRoomAsHostCompleted: function() {
    this.setState({
      mode: MODE.HOST,
      error: null,
    });
  },
  
  onJoinRoomAsClientFailed: function() {
    console.log('pretend tooltip');
    actions.general.handleError('joinRoomAsClient', res);
  },

  onJoinRoomAsClientCompleted: function() {
    this.setState({
      mode: MODE.CLIENT,
      error: null,
    });
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
    this.setState({error: strings.ERROR_UNKNOWN});
    this.trigger();
  },

  onClearError: function() {
    this.setState({error: null});
    this.trigger();
  },
});


// authorizations are persisted differently than other data.
// One host auth object lives in the global namespace at 'hostAuth',
// Client auth objects live at 'ns/{id}/auth'.
var auth = exports.auth = Reflux.createStore({
  listenables: [actions.general],

  mode: null,
  credentials: null,

  init: function() {
    // If a room id was set then try to load authorization credentials.
    if (room.state.id) {
      console.log('loading auth');
      var hostAuth = JSON.parse(localStorage.getItem('hostAuth'));
      var clientAuth = JSON.parse(storage.getItem('auth'));
      // check host auth first then client auth
      if (_.isPlainObject(hostAuth) && hostAuth.id == room.state.id) {
        console.log('found matching host auth');
        this.mode = MODE.HOST;
        room.setState(_.pick(hostAuth, 'password'));
        this.credentials = _.pick(hostAuth, 'key');
        actions.general.joinRoomAsHost();
        this.tigger();
      } else if (_.isPlainObject(clientAuth)) {
        console.log('found client auth');
        this.mode = MODE.CLIENT;
        this.credentials = _.pick(clientAuth, 'clientId', 'clientSecret');
        actions.general.joinRoomAsClient(this.credentials);
        this.trigger();
      } else {
        console.log('no auth found');
      }
    }
  },

  dump: function() {
    if (this.mode == MODE.HOST) {
      // use global-namespace storage device
      localStorage.setItem('hostAuth', JSON.stringify({
        id: room.state.id,
        password: room.state.password,
        key: this.credentials.key,
      }));
    } else if (this.mode == MODE.CLIENT) {
      // use namespaced storage device
      var clientAuth = _.pick(this.credentials, 'clientId', 'clientSecret');
      storage.setItem('auth', JSON.stringify(clientAuth));
    } else {
      console.log('can\'t dump empty auth');
    }
  },

  onCreateRoomCompleted: function(res) {
    this.mode = MODE.HOST;
    this.credentials = _.pick(res.body, 'key');
    this.dump();
  },

  onJoinRoomClientCompleted: function(response) {
    // if the auth mode is unset, a password-auth has occurred.
    if (this.mode == null) {
      this.mode = MODE.CLIENT;
      this.credentials = _.pick(response, 'clientId', 'clientSecret');
      this.dump();
    }
  },

  onJoinRoomHostFailed: function() {
    // host auth failed, clear it?
    console.log('failed to join room with host auth');
  },

  onJoinRoomClientFailed: function() {
    // client auth failed, clear it?
    console.log('failed to join room with client auth');
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
    this.playing = false;
  },
});

var playlist = exports.playlist = Reflux.createStore({
  mixins: [localStorageMixin('playlist')],

  state: [ { id: 0, track: 'Track 1', album: 'Example Album', artist: 'Example Artist', art: null, token: null, }, { id: 1, track: 'Track 2', album: 'Example Album', artist: 'Example Artist', art: null, token: null, }, { id: 2, track: 'Track 3', album: 'Example Album', artist: 'Example Artist', art: null, token: null, }, { id: 3, track: 'Track 4', album: 'Example Album', artist: 'Example Artist', art: null, token: null, }, { id: 4, track: 'Track 5', album: 'Example Album', artist: 'Example Artist', art: null, token: null, }, { id: 5, track: 'Track 6', album: 'Example Album', artist: 'Example Artist', art: null, token: null, }, ],

  init: function() {
  },

});

var queue = exports.queue = Reflux.createStore({
  mixins: [localStorageMixin('queue')],

  state: [ { id: 0 }, ],

  init: function() {
  },
});
