/** @jsx React.DOM */

'use strict';

var React = require('react'),
    Reflux = require('reflux');
var Header = require('components/Header'),
    CreateView = require('components/CreateView'),
    JoinView = require('components/JoinView'),
    stores = require('../../stores');
var shared = require('shared'),
    MODE = shared.MODE;

require('./style.css');

module.exports = React.createClass({
  displayName: 'App',
  mixins: [Reflux.connect(stores.general)],

  render: function() {
    var content = (function() {
      switch (this.state.mode) {
        case MODE.CREATE:
          return <CreateView error={this.state.error} />
        case MODE.JOIN:
          return <JoinView error={this.state.error} />
        default: // MODE.ERROR
          return (
            <div>
              <span>Error: Invalid mode '{this.state.mode}'</span>
              <span>{this.state.error}</span>
            </div>
          );
      }
    }).call(this);
    return (
      <div>
        <Header title={this.state.pathtoken} />
        <div className="content">
          {content}
        </div>
      </div>
    );
  }
});
