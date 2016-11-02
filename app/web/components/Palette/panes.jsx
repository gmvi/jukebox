'use strict';

var React = require('react'),
    LinkedStateMixin = React.addons.LinkedStateMixin,
    cx    = require('classnames'),
    request = require('superagent');

var shared = require('shared'),
    actions = require('web/actions'),
    Track  = require('components/Track');

var TAB = new shared.Enum([ 'youtube', 'soundcloud', 'spotify', 'upload',
    'settings', 'collapsed' ]);

require('./style.css');

var capitalize = (function() {
  var CAPITALIZE = {
    'soundcloud': 'SoundCloud',
    'youtube': 'YouTube',
    'spotify': 'Spotify',
  };
  return function(value) {
    var capitalized = CAPITALIZE[value];
    return capitalized?capitalized:value;
  };
})();

var SearchPane = exports.SearchPane = React.createClass({
  displayName: 'SearchPane',
  mixins: [LinkedStateMixin],

  getInitialState: function() {
    return {
      query: "",
      resultQuery: "",
      results: [],
      error: false,
    };
  },

  focus: function() {
    this.refs['search-'+this.props.service].getDOMNode().focus();
  },

  handleSearch: function(evt) {
    evt.preventDefault();
    var endpoint = '/api/search/' + this.props.service;
    var encodedQuery = encodeURIComponent(this.state.query);
    this.setState({
      resultQuery: this.state.query,
      results: [],
    });
    var self = this;
    request.get(endpoint+'?q='+encodedQuery)
      .end(function(err, res) {
        if (err) {
          self.setState({ error: true });
        } else {
          self.setState({
            error: false,
            results: res.body,
          });
        }
      });
  },

  addTrackHandler: function(i) {
    return (evt) => {
      actions.queue.addTrack(_.assign({
        service: this.props.service,
      }, this.state.results[i]));
    };
  },

  render: function() {
    var cxdescription = cx('results-description', {
      hidden: !(this.state.resultQuery),
    });
    return (
      <div className="search-pane">
        <form className="search-bar input-group">
          <input type="text" ref={'search-'+this.props.service}
            placeholder={ 'Search ' + capitalize(this.props.service) }
            valueLink={this.linkState('query')}
          />
          <button className="overlay-right fa fa-search"
            onClick={this.handleSearch}
          />
        </form>
        <div className="scroll-container">
          <div className="scroll no-scrollbar">
            <p className={cxdescription} >
              { "Results for " + this.state.resultQuery }
            </p>
            <div className="search-results">
              { this.state.results.map(function(track, i) {
                  return (
                    <div key={track.id}
                         className="search-result-item overlay-container" >
                      <Track
                        title={track.title} 
                        album={track.album}
                        artist={track.artist}
                        art={track.art}
                        iconFA="plus"
                        onClick={this.addTrackHandler(i)}
                      />
                    </div>
                  );
                }, this)
              }
            </div>
          </div>
        </div>
      </div>
    );
  },
});

var UploadPane = exports.UploadPane = React.createClass({
  displayName: 'UploadPane',

  getInitialState: function() {
    return {
      filepath: null,
    };
  },

  render: function() {
    return (
        <div className="upload-pane">
        </div>
        );
  },
});

var SettingsPane = exports.SettingsPane = React.createClass({
  displayName: 'SettingsPane',

  getInitialState: function() {
    return {
    };
  },

  render: function() {
    return (
        <div className="settings-pane">
        </div>
        );
  },
});
