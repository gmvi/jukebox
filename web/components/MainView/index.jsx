/** @jsx React.DOM */

'use strict';

var React  = require('react'),
    Reflux = require('reflux');

var Playlist = require('components/Playlist'),
    Controls = require('components/Controls'),
    Player   = require('components/Player'),
    actions  = require('web/actions'),
    stores   = require('web/stores');

require('./style.css');

module.exports = React.createClass({
  displayName: 'MainView',
  mixins: [
    Reflux.connect(stores.playlist, 'playlist'),
    Reflux.connect(stores.queue, 'queue'),
  ],
  
  onRemoveFromQueue: function(id) {
    actions.queue.removeTrack(id);
  },

  render: function() {
    return (
      <div className="app">
        <div className="left-pane">
          <Player />
          Playlist
          <Playlist list={this.state.playlist} />
        </div>
        <div className="right-pane">
          My Queue
          <Playlist list={this.state.queue}
                    onRemove={this.onRemoveFromQueue} />
          <Controls />
        </div>
      </div>
    );
  }
});
