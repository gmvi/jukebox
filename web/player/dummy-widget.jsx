var React = require('react');
var actions = require('web/actions');

module.exports = React.createClass({
  displayName: 'DummyWidget',

  init: function() {
    console.log('initing dummy widget');
  },

  onClick: function() {
    actions.player.next();
  },

  render: function() {
    return (
      <button onClick={this.onClick}>
        <span className="fa fa-4x fa-play" />
      </button>
    );
  },
})
