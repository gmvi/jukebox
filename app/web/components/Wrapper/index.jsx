var React = require('react');
var DomNodeWrapper = module.exports = React.createClass({
  componentDidMount: function(){
    this.updateNode(this.props.node);
  },
  componentWillRecieveProps: function(nextProps){
    if (nextProps.node !== this.props.node) {
      this.updateNode(nextProps.node);
    }
  },
  componentWillUnmount: function(){
    this.updateNode(null);
  },
  updateNode: function(node){
    var myNode = this.getDOMNode();
    for (var i=0; i<myNode.children.length; i++) {
      myNode.removeChild(myNode.children[i]);
    }

    if (node) {
      myNode.appendChild(node);
    }
  },
  render: function(){
    return <div className={this.props.className} />
  }
});
