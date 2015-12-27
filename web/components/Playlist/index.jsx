/** @jsx React.DOM */

'use strict';

var React = require('react');

var Track = require('components/Track');

require('./style.css');

module.exports = React.createClass({
  displayName: 'Playlist',

  getInitialState: function() {
    return {};
  },

  propTypes: {
    list: React.PropTypes.array.isRequired,
  },

  render: function(){
    return (
      <ul className="playlist">
        { this.props.list.map(function(item) {
            return <Track
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
