var fs = require('fs'),
    winston = require('winston');

var loadConfig = exports.loadConfig = function(configPath) {
  if (fs.existsSync(configPath)) {
    module.exports = require(configPath);
  } else {
    winston.warn("failed to find config file at %s -- aborting", configPath);
    process.exit(1);
  }
}

