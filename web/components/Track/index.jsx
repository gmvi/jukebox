/** @jsx React.DOM */

'use strict';

var React = require('react');

require('./style.css');

module.exports = React.createClass({
  displayName: 'Track',

  propTypes: {
    track:  React.PropTypes.string,
    album:  React.PropTypes.string,
    artist: React.PropTypes.string,
    art:    React.PropTypes.string,
  },

  render: function() {
    return (
      <li       className="track">
        <div    className="track-art-container">
          <img  className="track-art" src={this.props.art || '//:0'}   />
        </div>
        <div    className="track-main">
          <span className="track-track">  {this.props.track}  </span>
          <span className="track-album">  {this.props.album}  </span>
          <span className="track-artist"> {this.props.artist} </span>
        </div>
      </li>
    );
  },
});

