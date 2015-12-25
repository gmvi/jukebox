/** @jsx React.DOM */

'use strict';

var React = require('react'),
    cx    = require('classnames');

var shared = require('shared');

var TAB = new shared.Enum([ 'youtube', 'soundcloud', 'spotify', 'upload',
                            'settings', 'collapsed' ]);

require('./style.css');

module.exports = React.createClass({
  displayName: 'Controls',
  
  getInitialState: function() {
    return {
      tab: TAB.COLLAPSED,
    };
  },

  tab: function(newTab) {
    newTab = TAB[newTab];
    var controls = this;
    return function(e) {
      controls.setState({tab: newTab});
    };
  },

  render: function(){
    var collapsed = this.state.tab == TAB.COLLAPSED;
    return (
      <div className="controls-container">
        <div className={cx('controls', {collapsed: collapsed})}>
          <div className="tabs">
            <div className="spaced-tabs">
              <div className="tab" onClick={this.tab('youtube')} >
                <span className="icon fa-youtube" />
              </div>
              <div className="tab" onClick={this.tab('soundcloud')} >
                <span className="icon fa-soundcloud" />
              </div>
              <div className="tab" onClick={this.tab('spotify')} >
                <span className="icon fa-spotify" />
              </div>
              <div className="tab" onClick={this.tab('upload')} >
                <span className="icon fa-upload" />
              </div>
            </div>
            <div className="tab" onClick={this.tab('settings')} >
              <span className="icon fa-gear" />
            </div>
            <div className="tab" onClick={this.tab('collapsed')} >
              <span className="icon fa-minus" />
            </div>
          </div>
          <div className="controls-content">
          </div>
        </div>
      </div>
    );
  }
});
