'use strict';

var React = require('react'),
    cx = require('classnames');

require('./style.css');

module.exports = React.createClass({
  displayName: 'Header',

  render: function(){
    return (
      <header className='Header'>
        <span className="brand">Jukebox</span>
        { this.props.title ?
            <span>/{this.props.title}</span> :
            <span />
        }
      </header>
    );
  }
});
