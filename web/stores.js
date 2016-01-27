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

var MAX_PLAYLIST_LEN = 10;

// contains the namespaced localStorage wrapper
var storage = null;
// Events:
//   storage/{key}  emitted on storage events
var emitter = new EventEmitter();

var stateMixin = {
  setState: function(newState) {
    if (!_.isPlainObject(newState)) {
      console.warn('setState takes a plain object');
      return;
    }
    Object.keys(this.state).forEach(function(key) {
      if (!_.isUndefined(newState[key])) {
        this.state[key] = newState[key];
      }
    }, this);
    this.triggerState();
    if (typeof this.dump == 'function') {
      this.dump();
    }
  },
  triggerState: function() {
    this.trigger(this.getPublicState());
  },
  getPublicState: function() {
    return this.state;
  },
  getInitialState: function() {
    return this.getPublicState();
  },
}

var localStorageMixin = function(key) {
  return _.extend(stateMixin, {
    init: function() {
      if (storage) {
        this.load();
      } else {
        emitter.on('room-established', function() {
          this.load();
        }, this);
      }
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
      storage.setItem(key, JSON.stringify(this.state));
    },
  });
};

// The stores.
// Everything depends on room, so that loads first.
var room = exports.room = Reflux.createStore({
  mixins: [stateMixin],
  listenables: [actions.general, actions.room],
  state: {
    id: null,
    pathtoken: null,
    name: null,
    peer: null,
    password: null,
  },

  init: function() {
    if (window.vars && window.vars.room) {
      this.setState(window.vars.room);
    }
    if (this.state.id) {
      console.log('loaded room.id:', this.state.id);
      // load the Storage device for the room once id is set
      storage = new NamespacedStorage(this.state.id);
      storage.on('storage', function(e) {
        emitter.emit('storage/'+e.key, e);
      });
      emitter.emit('room-established');
    }
  },

  onCreateRoom: function(roomState) {
    this.setState({ password: roomState.password });
  },

  // from http api call
  onCreateRoomCompleted: function(status, body) {
    this.setState(body);
    // load the Storage device for the room once id is set
    storage = new NamespacedStorage(body.id);
    emitter.emit('room-established');
  },

  onJoinRoomAsHostCompleted: function() {
  },

  onJoinRoomAsClientCompleted: function() {
  },

  onUpdateCompleted: function(status, body) {
    // http api call
    this.setState(body);
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
    // window.onpopstate = function(evt) {
    //   this.setState(evt.state);
    // };
  },

  // updateHistory: function() {
  //   history.pushState(
  //     this.state,
  //     "Peertable: "+this.state.name, // title
  //     '/'+this.state.pathtoken // pathname
  //   );
  //   console.log('pushed state for', this.state.pathtoken);
  // },

  onCreateRoomFailed: function(err, res) {
    console.log('pretend tooltip');
    actions.general.handleError('createRoom', res);
  },

  onCreateRoomCompleted: function(status, body) {
    this.setState({
      mode: MODE.HOST,
      pathtoken: body.pathtoken,
      error: null,
    });
    // this.updateHistory();
  },

  onJoinRoomAsHostCompleted: function() {
    this.setState({
      mode: MODE.HOST,
      error: null,
    });
  },
  
  onJoinRoomAsClientFailed: function(err) {
    console.log('pretend tooltip');
    actions.general.handleError('joinRoomAsClient', err);
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
      this.setState({error: strings.ERROR_SERVER_FAILURE});
      return;
    }
    switch (context) {
      case 'createRoom':
        if (res.status == 400 && res.body.attribute == 'pathtoken') {
          switch (res.body.reason) {
            case 'duplicate':
              this.setState({error: strings.TOOLTIP_PATHTOKEN_DUPLICATE});
            case 'invalid':
              this.setState({error: strings.TOOLTIP_PATHTOKEN_INVALID});
          }
        }
    }
    this.setState({error: strings.ERROR_UNKNOWN});
  },

  onClearError: function() {
    this.setState({error: null});
  },
});


// authorizations are persisted differently than other data.
// One host auth object lives in the global namespace at 'hostAuth',
// Client auth objects live at 'ns/{id}/auth'.
var auth = exports.auth = Reflux.createStore({
  listenables: [actions.general, actions.clients],

  mode: null,
  credentials: null,
  clients: null,

  init: function() {
    // If a room id was set then try to load authorization credentials.
    if (room.state.id) {
      // load host auth from main storage
      var hostAuth = JSON.parse(localStorage.getItem('hostAuth'));
      // load clientAuth from namespaced storage
      var clientAuth = JSON.parse(storage.getItem('auth'));
      // check host auth first then client auth
      if (_.isPlainObject(hostAuth) && hostAuth.id == room.state.id) {
        console.log('found matching host auth');
        this.mode = MODE.HOST;
        this.clients = hostAuth.clients;
        room.setState(_.pick(hostAuth, 'password'));
        this.credentials = _.pick(hostAuth, 'key');
        actions.general.joinRoomAsHost();
      } else if (_.isPlainObject(clientAuth)) {
        console.log('found client auth');
        this.mode = MODE.CLIENT;
        this.credentials = _.pick(clientAuth, 'clientId', 'secret');
        actions.general.joinRoomAsClient(this.credentials);
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
        clients: this.clients,
      }));
    } else if (this.mode == MODE.CLIENT) {
      // use namespaced storage device
      if (_.isObject(this.credentials)) {
        var clientAuth = _.pick(this.credentials, 'clientId', 'secret');
        storage.setItem('auth', JSON.stringify(clientAuth));
      } else {
        storage.removeItem('auth');
      }
    } else {
      console.log('can\'t dump empty auth');
    }
  },

  onCreateRoomCompleted: function(status, body) {
    this.mode = MODE.HOST;
    this.credentials = _.pick(body, 'key');
    this.clients = {};
    this.dump();
  },

  onRecordAuth: function(credentials) {
    this.mode = MODE.CLIENT;
    this.credentials = _.pick(credentials, 'clientId', 'secret');
    this.dump();
  },

  onNewClient: function(clientId, secret) {
    console.log('new client');
    this.clients[clientId] = secret;
    this.dump();
  },

  onJoinRoomAsHostFailed: function() {
    // host auth failed, clear it?
    console.log('failed to join room with host auth');
  },

  onJoinRoomAsClientFailed: function() {
    // client auth failed, clear it?
    console.log('failed to join room with client auth');
    this.credentials = null;
  },
});

var player = exports.player = Reflux.createStore({
  //mixins: [localStorageMixin('player')],
  state: {
    playing: false,
    isSpotify: null,
    pointer: null,
  },

  init: function() {
  },
});

var queue = exports.queue = Reflux.createStore({
  mixins: [localStorageMixin('queue')],
  listenables: [actions.queue],

  state: {
    nextId: 0,
    tracks: [],
  },

  getPublicState: function() {
    return this.state.tracks;
  },

  init: function() {
  },

  onAddTrack: function(track) {
    track.id = this.state.nextId++;
    this.state.tracks.push(track);
    actions.queue.updated(this.getPublicState());
    this.dump();
    this.triggerState();
  },

  onRemoveTrack: function(id) {
    actions.queue.updated(this.getPublicState());
    _.remove(this.state.tracks, 'id', id);
    this.dump();
    this.triggerState();
  },

  onPop: function() {
    this.state.tracks.shift();
    this.dump();
    this.triggerState();
  },
});

var playlist = exports.playlist = Reflux.createStore({
  mixins: [localStorageMixin('playlist')],
  listenables: [actions.general, actions.playlist, actions.clients,
                actions.player],

  state: {
    clients: null,
    queues: null,
    current: null,
    list: [],
  },

  reconstructPlaylist: function() {
    var list = [];
    var exhausted = false;
    loop:
    for (var i = 0; exhausted == false; i++) {
      exhausted = true; // default if no tracks found
      for (var j = 0; j < this.state.clients.length; j++) {
        // if client j has track in position i, add it to the list
        var clientId = this.state.clients[j];
        if (this.state.queues[clientId].length > i) {
          list.push(this.state.queues[clientId][i]);
          if (list.length >= MAX_PLAYLIST_LEN) break loop;
          exhausted = false;
        }
      }
    }
    this.setState({ list: list });
    console.log('playlist reconstructed:', this.state.list);
  },

  getPublicState: function() {
    return this.state.list;
  },

  init: function() {
    this.listenTo(queue, (function(hostQueue) {
      if (general.state.mode == MODE.HOST) {
        this.onUpdate('0', hostQueue);
      }
    }).bind(this));
  },

  onCreateRoomCompleted: function() {
    this.setState({
      queues: {'0':[]},
      clients: ['0'],
    });
  },

  onNewClient: function(clientId) {
    if (general.state.mode == MODE.HOST) {
      this.state.clients.push(clientId);
      this.state.queues[clientId] = [];
      this.dump();
      // no need to trigger or reconstruct playlist
    }
  },

  onUpdate: function(clientId, queue) {
    if (general.state.mode == MODE.HOST) {
      // clone the queue
      queue = queue.slice();
      queue.forEach(function(e, i) {
        // clone each track before modifying id
        e = queue[i] = _.clone(e);
        e.id = clientId+'-'+e.id;
      });
      this.state.queues[clientId] = queue;
      this.reconstructPlaylist();
      // reconstructPlaylist calls setState, which dumps and triggers
    }
  },

  onUpdated: function(tracks) {
    if (general.state.mode == MODE.CLIENT) {
      this.setState({list: tracks});
    }
  },

  shift: function() {
    var current = this.state.list[0];
    var currentClient = this.state.clients[0];
    this.queues[currentClient].shift();
    this.clients.push(this.state.clients.shift());
    this.reconstructPlaylist();
    actions.playlist.updated();
  },

  onNext: function() {
    if (general.state.mode == MODE.HOST) {
      if (this.state.list.length) {
      }
    }
  },

  onSelectCurrent: function() {
    this.state.current = this.shift();
  }

});

//window.debug.stores = exports;
