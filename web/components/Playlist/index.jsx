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
    iconFA: React.PropTypes.string,
    onRemove: React.PropTypes.func,
  },

  render: function() {
    return (
      <ul className="playlist">
      { this.props.list.map(function(item) {
          console.log('constructing a track');
          return <Track
            key={item.id}
            title={item.title} 
            album={item.album}
            artist={item.artist}
            art={item.art}
            iconFA={this.props.iconFA}
            onClick={ this.props.onRemove? function() {
              this.props.onRemove(item.id);
            }:'' }
          />;
        }, this)
      }
      </ul>
    );
  }
});
