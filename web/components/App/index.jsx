'use strict';

var React = require('react'),
    Reflux = require('reflux');
var Header = require('components/Header'),
    CreateView = require('components/CreateView'),
    JoinView = require('components/JoinView'),
    MainView = require('components/MainView'),
    stores = require('../../stores');
var shared = require('shared'),
    MODE = shared.MODE;

require('./style.css');

module.exports = React.createClass({
  displayName: 'App',
  mixins: [Reflux.connect(stores.general)],

  render: function() {
    var content = (() => {
      switch (this.state.mode) {
        case MODE.CREATE:
          return <CreateView />
        case MODE.JOIN:
          return <JoinView />
        case MODE.HOST:
        case MODE.CLIENT:
          return <MainView />
        default: // MODE.ERROR
          return (
            <div>
              <span>Error: Invalid mode '{this.state.mode}'</span>
              <span>{this.state.error}</span>
            </div>
          );
      }
    })();
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
