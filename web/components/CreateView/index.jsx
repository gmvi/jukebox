/** @jsx React.DOM */

'use strict';

var React = require('react');

var utils = require('shared');

require('./style.css');

var RoomForm = React.createClass({
  displayName: 'RoomForm',
  getInitialState: function() {
    // just in case
    var pathtoken = utils.sanitizePathtoken(this.props.pathtoken);
    return {
      name: "Example Room Name!",
      pathtoken: pathtoken,
      password: "correct horse battery staple",
      autoPathtoken: !pathtoken,
      valid: !!pathtoken,
    };
  },
  componentWillMount: function() {
    this.handlePathtokenBlur();
  },

  handleNameChange: function(e) {
    this.setState({name: e.target.value});
    if (this.state.autoPathtoken) {
      var pathtoken = utils.sanitizePathtoken(e.target.value);
      this.setState({pathtoken: pathtoken});
    }
    this.verify();
  },
  handlePathtokenFocus: function(e) {
    if (this.state.autoPathtoken) {
      this.setState({pathtoken: ""});
    }
    this.verify();
  },
  handlePathtokenChange: function(e) {
    this.setState({
      pathtoken: e.target.value,
      autoPathtoken: !e.target.value
    });
    this.verify();
  },
  handlePathtokenBlur: function(e) {
    if (this.state.autoPathtoken) {
      var pathtoken = utils.sanitizePathtoken(this.state.name);
      this.setState({pathtoken: pathtoken});
    }
  },
  handlePasswordChange: function(e) {
    this.setState({password: e.target.value});
  },
  verify: function() {
    if (!this.state.name && !this.state.pathtoken) {
      this.setState({valid: false});
    }
  },

  render: function() {
    return (
      <form>
        <div className="input-group">
          <label htmlFor="roomName">Room Name</label>
          <input id="roomName" type="text"
            autoComplete="off"
            value={this.state.name}
            onChange={this.handleNameChange}
          />
        </div>
        <div className="input-group">
          <label htmlFor="roomName">Pathtoken</label>
          <input id="roomPathtoken" type="text"
            autoComplete="off"
            value={this.state.pathtoken}
            onChange={this.handlePathtokenChange}
            onFocus={this.handlePathtokenFocus}
            onBlur={this.handlePathtokenBlur}
          />
        </div>
        <div className="input-group">
          <label htmlFor="roomPassword">Password</label>
          <input id="roomPassword" type="text"
            autoComplete="off"
            value={this.state.password}
            onChange={this.handlePasswordChange}
          />
        </div>
      </form>
    );
  }
});

module.exports = React.createClass({
  displayName: 'CreateView',

  render: function() {
    if (!this.props.pathtoken) {
      return (
        <div className="CreateView">
          <p className="lead">
            Peertable is a peer-to-peer jukebox app.<br/>
          </p>
          <RoomForm />
        </div>
      );
    } else {
      return (
        <div className="CreateView">
        </div>
      );
    }
  }
});
