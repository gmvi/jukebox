'use strict';

var React = require('react'),
    App   = require('components/App');

// base layer
require('console-polyfill');
require('./transport.js');
require('./storage.js');
// reflux core
require('./actions.js');
require('./stores.js');
// external interaction
require('./rtc-controller.js');
require('./api-calls.js');
// frontend
require('./base.css');
React.render(<App />, document.getElementById('app-container'));
