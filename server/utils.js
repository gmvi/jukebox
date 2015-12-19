var fs = require('fs'),
    winston = require('winston');

var shared = require('../shared');

var loadConfig = exports.loadConfig = function(configPath) {
  try {
    return JSON.parse(fs.readFileSync(configPath));
  } catch (err) {
    winston.warn('failed to read config file at %s -- aborting', configPath);
    winston.warn('error was: %s', err);
    process.exit(1);
  }
}

exports.sanitizePathtoken = shared.sanitizePathtoken;

