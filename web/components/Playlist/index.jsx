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
    onRemove: React.PropTypes.func,
  },

  makeRemoveHandler: function(id) {
    return () => {
      if (this.props.onRemove) {
        this.props.onRemove(id);
      }
    };
  },

  render: function() {
    return (
      <ul className="playlist">
      { this.props.list.map(function(item) {
          return <Track
            key={item._id}
            title={item.title} 
            album={item.album}
            artist={item.artist}
            art={item.art}
            iconFA={ this.props.onRemove?'remove':null }
            onClick={ this.makeRemoveHandler(item._id) }
          />;
        }, this)
      }
      </ul>
    );
  }
});
