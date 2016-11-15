'use strict';

var React            = require('react'),
    LinkedStateMixin = React.addons.LinkedStateMixin,
    Reflux           = require('reflux'),
    cx               = require('classnames');

var stores  = require('web/stores'),
    actions = require('web/actions'),
    strings = require('web/strings.json'),
    utils   = require('shared');

require('./style.css');

module.exports = React.createClass({
  displayName: 'JoinView',
  mixins: [LinkedStateMixin],

  getInitialState: function() {
    return {
      password: "",
    };
  },

  handleJoinRoom: function(evt) {
    evt.preventDefault();
    actions.general.joinRoomAsClient({
      password: this.state.password,
    });
  },

  render: function() {
    return (
      <div id="JoinView" className="landing">
        <p className="lead">
          {strings.JOIN_LEAD}
        </p>
        <form>
          <div className="input-group">
            <label htmlFor="roomPassword">{strings.PASSWORD}</label>
            <input id="roomPassword" type="text"
                   valueLink={this.linkState('password')}
            />
          </div>
          <div className="input-group center">
            <button className="btn" onClick={this.handleJoinRoom} >
              Join Room
            </button>
          </div>
        </form>
        <div className={cx('error', {hidden: !stores.general.error})}>
          {stores.general.error}
        </div>
      </div>
    );
  }
});
