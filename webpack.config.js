var path = require('path');

var _       = require('lodash'),
    webpack = require('webpack');

module.exports = {
  entry: [
    path.join(__dirname, './app/web/entry.jsx') // your app's entry point
  ],
  devtool: process.env.WEBPACK_DEVTOOL || 'cheap-module-source-map',
  output: {
    path: path.join(__dirname, 'app', 'assets'),
    filename: 'bundle.js'
  },
  resolve: {
    extensions: ['', '.js', '.jsx'],
    alias: {
      react: 'react/addons',
      shared: path.join(__dirname, 'app', 'shared'),
      "static": path.join(__dirname, 'app', 'static'),
      web: path.join(__dirname, 'app', 'web'),
      components: path.join(__dirname, 'app', 'web/components')
    }
  },
  module: {
    loaders: [
      { test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: { presets: ['es2015', 'react'] }
      },
      { test: /\.css$/, loader: 'style-loader!css-loader' },
      { test: /\.html$/, loader: 'file?name=[name].[ext]' },
	  { test: /\.json$/, loader: 'json-loader' }
    ]
  }
};
