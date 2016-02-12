'use strict';

var React = require('react'),
    cx     = require('classnames'),
    Reflux = require('reflux');

var stores = require('web/stores');

require('./style.css');

module.exports = React.createClass({
  displayName: 'Player',
  mixins: [Reflux.connect(stores.player)],

  render: function(){
    console.log('rendering player', this.state.widget);
    return (
      <div className="player">
        {this.state.widget}
        <div className="controls">
        </div>
      </div>
    );
  }
});
