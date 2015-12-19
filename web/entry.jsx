/** @jsx React.DOM */

'use strict';

var React    = require('react'),
    App      = require('components/App');

var actions = require('./actions'),
    store = require('./store');

require('webrtc-adapter-test');

require('./base.css');

React.render(<App />, document.getElementById('app-container'));
