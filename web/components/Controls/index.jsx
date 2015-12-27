/** @jsx React.DOM */

'use strict';

var React = require('react'),
    LinkedStateMixin = React.addons.LinkedStateMixin,
    cx    = require('classnames'),
    request = require('superagent');

var shared = require('shared'),
    actions = require('web/actions'),
    Track  = require('components/Track'),
    panes = require('./panes');

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
    var self = this;
    var upper = TAB[newTab];
    var controls = this;
    return function(e) {
      controls.setState({tab: upper});
      setTimeout(function() {
        if (self.refs[newTab] && 'function' == typeof self.refs[newTab].focus) {
          self.refs[newTab].focus();
        }
      }, 0);
    };
  },

  render: function() {
    var collapsed = this.state.tab == TAB.COLLAPSED;
    var cxstack = cx( 'controls-stack', 'show-'+this.state.tab.toLowerCase());
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
          <div className={cxstack}>
            <div className="controls-content controls-youtube">
              <panes.SearchPane ref="youtube" service="youtube" />
            </div>
            <div className="controls-content controls-soundcloud">
              <panes.SearchPane ref="soundcloud" service="soundcloud" />
            </div>
            <div className="controls-content controls-spotify">
              <panes.SearchPane ref="spotify" service="spotify" />
            </div>
            <div className="controls-content controls-upload">
              <panes.UploadPane ref="upload" />
            </div>
            <div className="controls-content controls-settings">
              <panes.SettingsPane ref="settings" />
            </div>
          </div>
        </div>
      </div>
    );
  }
});
