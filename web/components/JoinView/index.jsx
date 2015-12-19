/** @jsx React.DOM */

'use strict';

var React = require('react');

require('./style.css');

module.exports = React.createClass({
  displayName: 'JoinView',

  render: function() {
    return (
      <div className="join-view">
        <Sidebar />
        <div className="main-content">
          <Controls />
          <div className="playlist-wrapper">
            <PlaylistPane />
          </div>
        </div>
      </div>
    );
  }
});
