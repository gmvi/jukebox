var path = require('path');

var _ = require('lodash');

var jsLoader = {
  test: /\.js$/,
  exclude: /(node_modules|bower_components)/,
  loader: 'babel-loader',
  query: {
    plugins: ['transform-es2015-arrow-functions'],
  }
};

var jsxLoader = _.merge({}, jsLoader, {
  test: /\.jsx$/,
  query: {
    presets: ['react'],
  }
});

module.exports = {
  entry: './web/entry.jsx',
  output: {
    path: 'assets',
    filename: 'bundle.js',
  },
  module: {
    loaders: [
      jsLoader,
      jsxLoader,
      { test: /\.css$/, loader: 'style!css' },
      { test: /\.json$/, loader: 'json-loader' },
    ],
  },
  resolve: {
    extensions: ['', '.js', '.jsx', '.json'],
    alias: {
      react: 'react/addons',
      shared: path.join(__dirname, 'shared'),
      web: path.join(__dirname, 'web'),
      components: path.join(__dirname, 'web/components'),
    }
  },
  devtool: 'cheap-module-inline-source-map',
};
