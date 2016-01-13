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

  makeRemoveHandler: function(id) {
    return (function() {
      if (this.props.onRemove) {
        this.props.onRemove(id);
      }
    }).bind(this);
  },

  render: function() {
    return (
      <ul className="playlist">
      { this.props.list.map(function(item) {
          return <Track
            key={item.id}
            title={item.title} 
            album={item.album}
            artist={item.artist}
            art={item.art}
            iconFA={this.props.iconFA}
            onClick={ this.makeRemoveHandler(item.id) }
          />;
        }, this)
      }
      </ul>
    );
  }
});
