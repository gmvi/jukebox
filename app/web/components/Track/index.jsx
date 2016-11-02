'use strict';

var React = require('react'),
    cx    = require('classnames');

require('./style.css');

module.exports = React.createClass({
  displayName: 'Track',

  propTypes: {
    title:   React.PropTypes.string,
    album:   React.PropTypes.string,
    artist:  React.PropTypes.string,
    art:     React.PropTypes.string,
    iconFA:  React.PropTypes.string,
    onClick: React.PropTypes.func,
  },

  render: function() {
    var trackArt = (
      <div className="track-art-container">
        <img className="track-art" src={this.props.art || '//:0'}   />
      </div>
    );
    var trackMain = (
      <div className="track-main">
        <span className="track-track">  {this.props.title}  </span>
        <span className="track-album">  {this.props.album}  </span>
        <span className="track-artist"> {this.props.artist} </span>
      </div>
    );
    var trackButton = this.props.iconFA?(
      <button className={cx('track-button', 'fa', 'fa-'+this.props.iconFA)}
              onClick={this.props.onClick} />
    ):'';
    return (
      <li className={cx('track', {'track-with-button': this.props.iconFA})}
          onClick={!this.props.iconFA?this.props.onClick:''} >
        {trackArt}
        {trackMain}
        {trackButton}
      </li>
    );
  },
});

