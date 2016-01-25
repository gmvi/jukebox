var _ = require('lodash');

var isParamRegexp = /^:/;
var isEscapedColonRegexp = /^\\:/;
var startsWithSlash = /^\//;
var endsWithSlash = /\/$/;

// Style Notes:
// To help reason aobut the code, all functions named next in this codebase
// should be written to be guaranteed to return quickly and be idempotent

// wraps a function to make it both defered and idempotent
var wrap = function(_next) {
  var called = false;
  return function() {
    if (called) {
      throw new Error('next called twice');
    } else {
      called = true;
      _.defer(_next);
    }
  };
};

var compose = function(fns) {
  // can't be modified after the call
  if (!_.isArray(fns)) {
    throw new TypeError('fns should be an array of functions');
  }
  fns.forEach(function(fn) {
    if (!_.isFunction(fn)) {
      throw new TypeError('fns should be an array of functions');
    }
  });
  var funcs = fns.slice();
  var i = 0;
  return function(req, res, next) {
    var finalI = funcs.length - 1;
    function _next() {
      if (i == finalI) {
        // next satisfies the required properties
        funcs[i](req, res, next);
      } else {
        // _next must be wrapped
        funcs[i](req, res, wrap(_next));
        i++
      }
    }
    _next();
  };
};


var makeMethod = function(method) {
  var attachHandler = function attachHandler(route) {
    // handle variadic parameters
    var path;
    var fns;
    var handler;
    var isSubRouter = false
    if (!_.isFunction(route)) {
      path = route;
      fns = Array.prototype.slice.call(arguments, 1);
    } else {
      path = '';
      fns = Array.prototype.slice.call(arguments, 0);
    }
    // use(['a', 'b'], fn) => { use('a', fn); use('b', fn); }
    if (_.isArray(path)) {
      var args = Array.prototype.slice.call(arguments);
      path.forEach((function(path) {
        args[0] = path;
        attachHandler.apply(this, args);
      }).bind(this));
      return;
    }
    var fnMsg = 'Router.' + (method || 'use') + ' takes'
              + (method ? '' : ' one Router or')
              + ' one or more handler functions';
    if (fns.length == 0) {
      throw new TypeError(fnMsg);
    } else if (fns.length == 1) {
      handler = fns[0];
      if (!method && _.isFunction(handler.handle)) {
        // handler get Router.handle
        handler = handler.handle.bind(handler);
        isSubRouter = true;
        // else-if below because handler must be a function at this point
      } else if (!_.isFunction(handler)) {
        throw new TypeError(fnMsg);
      }
    } else {
      // compose will throw a TypeError if not all fns are Functions
      handler = compose(fns);
    }
    // TODO: force standard leading/trailing slashes
    // make regexp
    var parts = path.split('/');
    var regexpParts = [];
    var paramNames = [];
    parts.forEach(function(part) {
      if (isParamRegexp.test(part)) {
        regexpParts.push('([^/]*)');
        paramNames.push(part.slice(1));
      } else if (isEscapedColonRegexp.test(part)) {
        regexpParts.push(part.slice(1));
      } else {
        regexpParts.push(part);
      }
    });
    var regexpStr = '^' + regexpParts.join('/') + '/';
    if (method) regexpStr += '$';
    var regexp = new RegExp(regexpStr);
    // closure to wrap the handler in route testing logic
    var middleware = function middleware(req, res, next) {
      // NB: in this codebase, every variable named next should return quickly
      // if method is wrong, skip
      if (method && (req.method != method)) {
        return next();
      }
      var match = regexp.exec(req.path + '/');
      // if path doesn't match, skip
      if (!match) {
        return next();
      }
      // modify req and res
      // copy properties to be modified
      var overwrittenProps = _.pick(req, ['params', 'basePath', 'path']);
      // gather and assign params for this handler
      var params = _.zipObject(paramNames, match.slice(1));
      if (_.isObject(req.params)) {
        // layer new params on top of old
        params = _.assign({}, req.param, params);
      }
      req.params = params;
      if (isSubRouter) {
        // NB: regexp starts with '^'
        req.basePath = match[0];
        req.path = req.path.slice(match[0].length);
      }
      // invoke handler with modified req
      handler(req, res, function() {
        // reset req
        _.assign(req, overwrittenProps);
        next();
        // guaranteed to return quickly
      });
    };
    this.stack.push(middleware);
  };
  return attachHandler;
};


function Router() {
  if (!this instanceof Router) {
    return new Router();
  }
  this.stack = [];
}
_.assign(Router.prototype, {
  use: makeMethod(),
  get: makeMethod('get'),
  post: makeMethod('post'),
  handle: function(req, res, end) {
    if (typeof req != 'object' ||
        typeof res != 'object' || 
        typeof end != 'function') {
      throw new TypeError();
    }
    _.defaults(req, {
      path: '',
      method: 'get',
    });
    req.origPath = req.origPath || req.path;
    if (startsWithSlash.test(req.path)) {
      req.path = req.path.slice(1);
    }
    if (endsWithSlash.test(req.path)) {
      req.path = req.path.slice(0, -1);
    }

    var i = 0;
    var stack = this.stack;

    _next();
    function _next() {
      if (i < stack.length) {
        var middleware = stack[i++];
        var nextCalled = false;
        // _next must be wrapped
        middleware(req, res, wrap(_next));
      } else {
        end();
      }
    }
  },
});

module.exports = Router;
