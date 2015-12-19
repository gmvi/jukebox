/** @jsx React.DOM */

'use strict';

var React = require('react'),
    Header = require('components/Header'),
    CreateView = require('components/CreateView'),
    JoinView = require('components/JoinView'),
    store = require('../../store');
var shared = require('shared'),
    MODE = shared.MODE;

require('./style.css');

module.exports = React.createClass({
  displayName: 'App',

  render: function() {
    if (store.mode == MODE.CREATE) {
      return (
        <div>
          <Header title={store.pathtoken} />
          <div className="content">
            { store.pathtoken ?
              <CreateView pathtoken={store.pathtoken}/> :
              <CreateView />
            }
          </div>
        </div>
      );
    } else if (store.mode == MODE.JOIN) {
      return (
        <div>
          <Header title={store.pathtoken} />
          <div className="content">
            <JoinView pathtoken={store.pathtoken}/>
          </div>
        </div>
      );
    } else {
      return (
        <div> Error! {store.mode}</div>
      );
    }
  }
});
