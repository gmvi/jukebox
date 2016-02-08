'use strict';

var React            = require('react/addons'),
    LinkedStateMixin = React.addons.LinkedStateMixin,
    Reflux           = require('reflux'),
    cx               = require('classnames');

var stores  = require('web/stores'),
    actions = require('web/actions'),
    strings = require('web/strings'),
    utils   = require('shared');

require('./style.css');

var RoomForm = React.createClass({
  displayName: 'RoomForm',
  mixins: [LinkedStateMixin],
  
  getInitialState: function() {
    var pathtoken = stores.general.state.pathtoken;
    return {
      name: "",
      pathtoken: pathtoken,
      password: "",
      autoPathtoken: !pathtoken,
      valid: !!pathtoken,
    };
  },
  componentWillMount: function() {
    this.handlePathtokenBlur();
  },

  handleNameChange: function(e) {
    this.setState({name: e.target.value});
    var pathtoken = this.state.pathtoken;
    if (this.state.autoPathtoken) {
      pathtoken = utils.sanitizePathtoken(e.target.value);
      this.setState({pathtoken: pathtoken});
    }
    this.setState({valid: !!pathtoken});
  },
  handlePathtokenFocus: function(e) {
    if (this.state.autoPathtoken) {
      this.setState({pathtoken: ""});
    }
  },
  handlePathtokenChange: function(e) {
    this.setState({
      pathtoken: e.target.value,
      autoPathtoken: !e.target.value,
      valid: !!e.target.value,
    });
  },
  handlePathtokenBlur: function(e) {
    if (this.state.autoPathtoken) {
      var pathtoken = utils.sanitizePathtoken(this.state.name);
      this.setState({ pathtoken: pathtoken,
                      valid: !!pathtoken });
    }
  },
  handlePasswordChange: function(e) {
    this.setState({password: e.target.value});
  },

  handleCreateRoom: function(e) {
    e.preventDefault();
    actions.general.createRoom(this.state);
  },

  render: function() {
    return (
      <div className="RoomForm">
        <form>
          <div className="input-group">
            <label htmlFor="roomPathtoken">Pathtoken</label>
            <input id="roomPathtoken" type="text"
              autoComplete="off"
              value={this.state.pathtoken}
              onChange={this.handlePathtokenChange}
              onFocus={this.handlePathtokenFocus}
              onBlur={this.handlePathtokenBlur}
            />
          </div>
          <div className="input-group">
            <label htmlFor="roomName">Room Name</label>
            <input id="roomName" type="text"
              autoComplete="off"
              value={this.state.name}
              onChange={this.handleNameChange}
            />
          </div>
          <div className="input-group">
            <label htmlFor="roomPassword">Password</label>
            <input id="roomPassword" type="text"
              autoComplete="off"
              valueLink={this.linkState('password')}
            />
          </div>
          <div className="input-group center">
            <button className="btn"
                    onClick={this.handleCreateRoom}
                    disabled={!this.state.valid}>
              New Room
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

module.exports = React.createClass({
  displayName: 'CreateView',

  render: function() {
    return (
      <div id="CreateView" className="landing">
        <p className="lead">
          {strings.CREATE_LEAD}
        </p>
        <RoomForm />
      </div>
    );
 }
});
