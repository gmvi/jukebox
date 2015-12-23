/** @jsx React.DOM */

'use strict';

var React    = require('react'),
    App      = require('components/App');

require('./base.css');

React.render(<App />, document.getElementById('app-container'));
