/** @jsx React.DOM */

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
    var cxPlayPause = cx('player-toggle', 'fa', 'fa-4x',
        this.state.playing?'fa-pause':'fa-play'
    );
    return (
      <div className="player">
        <span className="block-center">
          <span className="player-prev fa fa-step-backward fa-4x" />
          <span className={cxPlayPause} />
          <span className="player-next fa fa-step-forward fa-4x" />
        </span>
      </div>
    )
  }
});
