var path = require('path');

module.exports = {
  entry: './web/entry.jsx',
  output: {
    path: 'public',
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      { test: /\.jsx$/, loader: 'jsx-loader' },
      { test: /\.css$/, loader: 'style!css' }
    ]
  },
  resolve: {
    extensions: ['', '.js', '.jsx'],
    alias: {
      components: path.join(__dirname, 'web/components'),
      react: 'react/addons'
    }
  },
  devtool: 'cheap-module-inline-source-map'
};
