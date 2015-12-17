var Reflux = require('reflux');

var actions = require('./actions'),
    enums   = require('../shared/enums');

module.exports = Reflux.createStore({
    listenables: [actions],
    mode: null,
    room: null,
    init : function() {
        if (window.vars.mode && enums.MODE.has(window.vars.mode)) {
            this.mode = window.vars.mode;
        } else if (window.location.pathname != '/') {
            // if this happens, the server is violating spec :/
            // let's hope the landing page is more stable?
            window.location = '/';
        } else {
            this.mode = enums.MODE.ERROR;
        }
        console.log(this.mode);
    }
});
