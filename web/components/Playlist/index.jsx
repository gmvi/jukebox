/** @jsx React.DOM */

'use strict';

var React = require('react');

require('./style.css');

var PlaylistItem = React.createClass({
  displayName: 'PlaylistItem',

  propTypes: {
    track: React.PropTypes.string,
    album: React.PropTypes.string,
    artist: React.PropTypes.string,
    art: React.PropTypes.string,
  },

  render: function() {
    return (
      <li className="playlist-item">
        <img className="playlist-art" src={this.props.art} />
        <span className="playlist-track">{this.props.track}</span>
        <span className="playlist-album">{this.props.album}</span>
        <span className="playlist-artist">{this.props.artist}</span>
      </li>
    );
  },
});

module.exports = React.createClass({
  displayName: 'Playlist',

  propTypes: {
    list: React.PropTypes.array.isRequired,
  },

  render: function(){
    return (
      <ul className="playlist">
        { this.props.list.map(function(item) {
            return <PlaylistItem
                     key={item.id}
                     track={item.track} 
                     album={item.album}
                     artist={item.artist}
                     art={item.art}
                   />;
          })
        }
      </ul>
    );
  }
});
