/** @jsx React.DOM */

'use strict';

var React = require('react');

require('./style.css');

module.exports = React.createClass({
  displayName: 'Player',

  render: function(){
    return <div className="player"></div>;
  }
});
