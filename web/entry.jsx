/** @jsx React.DOM */

'use strict';

var React = require('react'),
    App   = require('components/App');

var actions = require('./actions'),
    stores = require('./stores');

require('webrtc-adapter-test');

require('./base.css');

React.render(<App />, document.body);
