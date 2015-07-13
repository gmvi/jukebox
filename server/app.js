// Patchwork
// peer-to-peer party-playlisting

var fs   = require('fs'),
    http = require('http');

var _         = require('lodash'),
    async     = require('async'),
    commander = require('commander'),
    path      = require('path'),
    winston   = require('winston'),
    Hapi      = require('hapi');

var util = require('./util');

commander
  .option('-h, --hostname [hostname]', 'Restrict to a hostname')
  .option('-p, --port [portnum]', 'Specify a port number [default 8080]')
  .option('-c, --config [path]', 'Specify an alternate config location [default /etc/influx.conf.json]',
          path.resolve, '/etc/influx.conf.json')
  .parse(process.argv)

// layer command-line options over the config over the defaults
var defaults = {
  'port': 8080,
  'logLevel': 'debug',
}
var config = util.loadConfig(commander.config);
global.config = _.assign(defaults, config, commander.opts(), function(value, other) {
  return _.isUndefined(other) ? value : other;
});
winston.level = global.config.logLevel;

winston.debug('Logging debug messages!');
winston.info('Configuring server...');

var server = new Hapi.Server({
});

server.connection({
  host: global.config.hostname,
  port: global.config.port,
});

server.route({
  method: 'GET',
  path: '/{param*}',
  handler: {
    directory: {
      path: 'public/',
    },
  },
});

server.start(function(err) {
  if (err) process.exit(1);
  else {
    winston.info("Server running at: ", server.info.uri);
  }
});
