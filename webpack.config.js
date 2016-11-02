var path = require('path');

var _       = require('lodash'),
    webpack = require('webpack');

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
  entry: './app/web/entry.jsx',
  output: {
    path: 'assets',
    filename: 'bundle.js',
  },
  plugins: [
  ],
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

if (process.env.NODE_ENV === 'production') {
  module.exports.plugins.push(
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
      },
    })
  );
}
