var path = require('path');

module.exports = {
  entry: './web/entry.jsx',
  output: {
    path: 'assets',
    filename: 'bundle.js',
  },
  module: {
    loaders: [
      { test: /\.jsx$/, loader: 'jsx-loader' },
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
