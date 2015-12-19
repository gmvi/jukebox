var Reflux = require('reflux');

var actions = require('./actions'),
    shared   = require('shared'),
    MODE = shared.MODE;

module.exports = Reflux.createStore({
    listenables: [actions],
    mode: null,
    room: null,
    pathtoken: null,
    init : function() {
        if (window.vars.mode && MODE.has(window.vars.mode)) {
            this.mode = window.vars.mode;
        } else if (window.location.pathname != '/') {
            // if this happens, the server is violating spec :/
            // let's hope the landing page is more stable?
            window.location = '/';
        } else {
            this.mode = MODE.ERROR;
        }
        this.pathtoken = window.location.pathname.slice(1);
    }
});
