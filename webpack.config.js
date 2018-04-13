/* eslint-env node */
var path = require('path');
var staticContentDir = path.resolve('contentcuration', 'contentcuration', 'static');

module.exports = {
  entry: {
    base: path.resolve(staticContentDir, 'bundle_modules', 'base.js'),
    channel_edit: path.resolve(staticContentDir, 'bundle_modules', 'channel_edit.js'),
  },
  output: {
    filename: '[name].js',
    path: path.resolve(staticContentDir, 'js','bundles'),
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        include: [
          path.resolve(staticContentDir, 'js', 'bundle_modules')
        ],
      },
      {
        test: /\.less?$/,
        include: [
          path.resolve(staticContentDir, 'less', 'bundle_modules')
        ],
      },
    ],
  },
};
