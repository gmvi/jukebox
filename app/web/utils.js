var _       = require('lodash'),
    shared  = require('shared');

// graft shared onto this module before adding things
_.assign(exports, shared);

exports.escapeRegExp = function(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

exports.noop = function(){};
