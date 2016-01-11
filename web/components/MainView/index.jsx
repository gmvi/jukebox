/** @jsx React.DOM */

'use strict';

var React  = require('react'),
    Reflux = require('reflux');

var Playlist = require('components/Playlist'),
    Controls = require('components/Controls'),
    Player = require('components/Player'),
    stores = require('web/stores');

require('./style.css');

module.exports = React.createClass({
  displayName: 'MainView',
  mixins: [
    Reflux.listenTo(stores.playlist, "onPlaylistUpdate"),
    Reflux.listenTo(stores.queue, "onQueueUpdate"),
  ],
  
  getInitialState: function() {
    return {
      playlist: stores.playlist.state.tracks,
      queue: stores.queue.state.tracks,
    };
  },

  onPlaylistUpdate: function(state) {
    this.setState({ playlist: state.tracks });
  },
  onQueueUpdate: function(state) {
    this.setState({ queue: state.tracks });
  },

  onRemoveTrack: function(id) {
    actions.queue.removeTrack(id);
  },

  render: function() {
    console.log('rendering main');
    return (
      <div className="app">
        <div className="left-pane">
          <Player />
          Playlist
          <Playlist list={this.state.playlist} />
        </div>
        <div className="right-pane">
          Queue
          <Playlist list={this.state.queue} onRemove={this.onRemoveTrack} />
          <Controls />
        </div>
      </div>
    );
  }
});
