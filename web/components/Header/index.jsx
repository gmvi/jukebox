/** @jsx React.DOM */

'use strict';

var React = require('react'),
    cx = require('classnames');

require('./style.css');

module.exports = React.createClass({
  displayName: 'Header',

  render: function(){
    var classes = cx({
      'Header': true
    });
    return (
      <header className={classes}>
        <a className="brand" href="/">
          [header brand]
        </a>
      </header>
    );
  }
});
