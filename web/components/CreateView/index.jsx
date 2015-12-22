/** @jsx React.DOM */

'use strict';

var React            = require('react/addons'),
    LinkedStateMixin = React.addons.LinkedStateMixin;

var utils = require('shared');

require('./style.css');

var RoomForm = React.createClass({
  displayName: 'RoomForm',
  propTypes: {
    pathtoken: React.PropTypes.string,
  },
  mixins: [LinkedStateMixin],
  
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

  handleCreateRoom: function() {

  },

  render: function() {
    return (
      <form className="RoomForm">
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
            valueLink={this.linkState('password')}
          />
        </div>
        <div className="input-group center">
          <button onClick={this.handleCreateRoom}
                  disabled={!this.state.valid}>
            New Room
          </button>
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
