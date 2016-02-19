var querystring = require('querystring');
var _            = require('lodash'),
    EventEmitter = require('eventemitter3'),
    React        = require('react');
var DummyWidget = require('./dummy-widget'),
    Wrapper     = require('components/Wrapper');

var dummyService = { load: _.noop, play: _.noop, pause: _.noop };

function Player() {
  EventEmitter.call(this);
  this.currentTrack = null;
  this.stoppedWidget = <DummyWidget />;
  this.services = {};
  Object.defineProperty(this, 'currentService', {
    get: function() {
      if (this.currentTrack) {
        return this.services[this.currentTrack.service];
      } else {
        return dummyService;
      }
    },
  });
  Object.defineProperty(this, 'widget', {
    get: function() {
      return this.currentService.widget || this.stoppedWidget;
    },
  });
}
_.extend(Player.prototype, EventEmitter.prototype, {
  register: function(serviceName, serviceHandler) {
    if (this.services[serviceName] !== undefined) {
      throw new Error('service name already in use or reserved: '+serviceName);
   }
    // don't register finish handler twice
    if (!_.some(this.services, (value) => { value === serviceHandler })) {
      serviceHandler.on('finish', () => {
        if (this.currentService === serviceHandler) {
          this.emit('finish');
        }
      });
    }
    this.services[serviceName] = serviceHandler;
  },
  load: function(track, autoplay) {
    this.currentService.pause();
    this.currentTrack = track;
    this.currentService.load(track, autoplay);
  },
});

var player = module.exports = new Player();

function StreamPlugin(getSrc) {
  EventEmitter.call(this);
  this.getSrc = getSrc;
  this.audio = new Audio();
  this.audio.controls = true;
  this.widget = <Wrapper
    className="widget widget-native"
    node={this.audio}
  />;
  _.forEach([
    'error', 'abort', 'canplay', 'pause', 'play', 'waiting'
  ], type => {
    this.audio['on'+type] = this.emit.bind(this, type);
  });
}
_.extend(StreamPlugin.prototype, EventEmitter.prototype, {
  load: function(track, autoplay) {
    this.audio.src = this.getSrc(track);
    this.audio.play();

    return (
      this.audio
    );
  },
  stop: function() {
    this.audio.stop();
  },
});

// private static vars
var opts = {
  show_artwork: false,
  auto_play: true,
  buying: false,
  liking: false,
  sharing: false,
  show_comments: false,
  hide_related: true,
};
var optsAutoplay = _.defaults({
  auto_play: false,
}, opts);
function SoundCloudPlugin() {
  EventEmitter.call(this);
  var iframe = document.createElement('iframe');
  // the ? is necessary for the sc.load() method to work properly
  iframe.src = 'https://w.soundcloud.com/player/?';
  this.widget = <Wrapper
    key="sc"
    className="widget widget-sc"
    node={iframe}
  />;
  this.sc = SC.Widget(iframe);
  this.sc.bind(SC.Widget.Events.FINISH, () => {
    this.emit('finish');
  });
  this.sc.bind(SC.Widget.Events.READY, () => {
    if (this.whenReady) {
      if (this.whenReady === 'play') this.sc.play();
      else if (this.whenReady === 'pause') this.sc.pause();
      this.whenReady = null;
    }
    this.ready = true;
  });
}
_.extend(SoundCloudPlugin.prototype, EventEmitter.prototype, {
  load: function(track, autoplay) {
    this.ready = false;
    var o = autoplay?optsAutoplay:opts;
    this.sc.load("http://api.soundcloud.com/tracks/"+track.id, o);
  },
  play: function() {
    if (this.ready) this.sc.play();
    else this.whenReady = 'play';
  },
  pause: function() {
    if (this.ready) this.sc.pause();
    else this.whenReady = 'pause';
  },
});

// private static vars
var queue = [];
var ready = false;
window.onYouTubeIframeAPIReady = function() {
  console.log('youtube api ready');
  ready = true;
  queue.forEach(fn => {
    fn();
  });
  queue = [];
};
var onYTReady = function(fn) {
  if (ready) fn();
  else queue.push(fn);
};
function YouTubePlugin() {
  EventEmitter.call(this);
  var div = document.createElement('div');
  var inner = div.appendChild(document.createElement('div'));
  onYTReady(() => {
    console.log('initializing player');
    this.yt = new YT.Player(inner, {
      height: '390',
      width: '640',
      videoId: '',
      playerVars: { controls: 1, fs: 0, },
      events: {
        'onReady': this.onPlayerReady.bind(this),
        'onStateChange': this.onPlayerStateChange.bind(this),
      }
    });
  });
  this.widget = <Wrapper
    key="yt"
    className="widget widget-yt"
    node={div}
  />;
  this.ready = false;
  this.queue = [];
}
_.extend(YouTubePlugin.prototype, EventEmitter.prototype, {
  whenReady: function(fn) {
    if (this.ready) fn();
    else this.queue.push(fn);
  },
  onPlayerReady: function(e) {
    console.log('player ready');
    this.ready = true;
    this.queue.forEach(fn => {
      fn();
    });
    this.queue = [];
  },
  onPlayerStateChange: function(e) {
    if (e.data == YT.PlayerState.ENDED) {
      this.emit('finish');
    } else {
      // console.log('player state change', e);
    }
  },
  load: function(track, autoplay) {
    console.log('load called');
    this.whenReady(() => { 
      this.yt.loadVideoById(track.id);
    });
  },
  play: function() {
    this.whenReady(() => { 
      this.yt.playVideo();
    });
  },
  pause: function() {
    this.whenReady(() => { 
      this.yt.pauseVideo();
    });
  },
});

player.register('webrtc', new StreamPlugin(function(track) {
  return "";
}));

player.register('soundcloud', new SoundCloudPlugin());
player.register('youtube', new YouTubePlugin());

//TODO: implement services
