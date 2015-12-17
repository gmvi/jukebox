/** @jsx React.DOM */

'use strict';

var React = require('react'),
    Header = require('components/Header'),
    Controls = require('components/Controls'),
    Sidebar = require('components/Sidebar'),
    PlaylistPane = require('components/PlaylistPane');

require('./style.css');

module.exports = React.createClass({
  displayName: 'App',

  render: function(){
    return (
      <div className="root-app">
        <Header />
        <div className="content">
          <Sidebar />
          <div className="main-content">
            <Controls />
            <div className="playlist-wrapper">
              <PlaylistPane />
            </div>
          </div>
        </div>
      </div>
    );
  }
});
