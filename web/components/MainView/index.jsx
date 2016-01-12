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
    Reflux.connect(stores.playlist, 'playlist'),
    Reflux.connect(stores.queue, 'queue'),
  ],
  
  onRemoveTrack: function(id) {
    actions.queue.removeTrack(id);
  },

  render: function() {
    console.log('rendering main');
    return (
      <div className="app">
        <div className="left-pane">
          <Player />
        </div>
        <div className="right-pane">
          Queue
          <Playlist list={this.state.queue}
                    iconFA='remove'
                    onRemove={this.onRemoveTrack} />
          <Controls />
        </div>
      </div>
    );
  }
});
