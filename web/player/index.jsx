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
  this.widget = <DummyWidget />;
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
      return this.currentService.widget;
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
  this.widget = <Wrapper node={this.audio} />;
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
  this.iframe = document.createElement('iframe');
  // the ? is necessary for the sc.load() method to work properly
  this.iframe.src = 'https://w.soundcloud.com/player/?';
  this.widget = <Wrapper className="widget widget-sc" node={this.iframe} />;
  window.debug = window.debug || {};
  window.debug.i = this.iframe;
  this.sc = SC.Widget(this.iframe);
  window.debug.sc = this.sc;
  this.sc.bind(SC.Widget.Events.FINISH, () => {
    this.emit('finish');
  });
}
_.extend(SoundCloudPlugin.prototype, EventEmitter.prototype, {
  load: function(track, autoplay) {
    var o = autoplay?optsAutoplay:opts;
    this.sc.load("http://api.soundcloud.com/tracks/"+track.id, o);
  },
  play: function() {
    this.sc.play();
  },
  pause: function() {
    this.sc.pause();
  },
});

player.register('webrtc', new StreamPlugin(function(track) {
  return "";
}));

player.register('soundcloud', new SoundCloudPlugin());

//TODO: implement services
