/** @jsx React.DOM */

'use strict';

var React = require('react');

require('./style.css');

module.exports = React.createClass({
  displayName: 'Sidebar',

  render: function(){
    return <div className="Sidebar"></div>;
  }
});
