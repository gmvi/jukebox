/** @jsx React.DOM */

'use strict';

var React = require('react');

var Playlist = require('components/Playlist'),
    Controls = require('components/Controls'),
    Player = require('components/Player'),
    stores = require('web/stores');

require('./style.css');

module.exports = React.createClass({
  displayName: 'MainView',

  render: function() {
    return (
      <div className="app">
        <div className="left-pane">
          <Player />
          <Playlist list={stores.playlist.state} />
        </div>
        <div className="right-pane">
          <Playlist list={stores.queue.state} />
          <Controls />
        </div>
      </div>
    );
  }
});
