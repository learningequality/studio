/* eslint-env node */
const CleanWebpackPlugin = require('clean-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

const staticFilesDir = path.resolve('contentcuration', 'contentcuration', 'static');
const staticJsDir = path.resolve(staticFilesDir, 'js');
const staticLessDir = path.resolve(staticFilesDir, 'less');

const bundleEntryDir = path.resolve(staticJsDir, 'bundle_modules');
const bundleOutputDir = path.resolve(staticJsDir,'bundles');

const jsLoaders = [
  {
    loader: 'babel-loader',
    options: {
      // might be able to limit browsers for smaller bundles
      presets: ['env'],
    },
  }
];

// NOTE: Lots of things are handled by webpack4. NODE_ENV, uglify, source-maps
// see: https://medium.com/webpack/webpack-4-mode-and-optimization-5423a6bc597a

module.exports = {
  context: bundleEntryDir,
  entry: {
    base: './base.js',
    channel_edit: './channel_edit.js',
  },
  output: {
    filename: '[name].js',
    path: bundleOutputDir,
  },
  // add source maps for use in chrome for debugging. default for 'development' mode is 'eval'
  // Remove this line if speed becomes an issue
  devtool: 'inline-source-map',
  optimization: {
    // builds a bundle that holds common code between the 2 entry points
    splitChunks: {
      cacheGroups: {
          commons: {
              name: "common",
              chunks: "initial",
              minChunks: 2
          }
      }
    },
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /node_modules?/,
        use:jsLoaders,
      },
      {
        test: /\.handlebars?$/,
        use:[
          'handlebars-template-loader',
        ],
      },
      {
        test: /\.less?$/,
        use: [
          `style-loader`,
          `css-loader`,
          'less-loader',
        ],
      },
      {
        test: /\.css?$/,
        use: [
          `style-loader`,
          `css-loader`,
        ],
      },
      {
        test: /\.vue?$/,
        loader:'vue-loader',
        options: {
          loaders: {
            js: jsLoaders,
          }
        },
      },
    ],
  },
  resolve: {
    alias: {
      // explicit alias definitions (rather than modules) for speed
      edit_channel: path.resolve(staticJsDir, 'edit_channel'),
      utils: path.resolve(staticJsDir, 'utils'),
    },
    // carryover of path resolution from build.js
    modules: ['node_modules', staticLessDir],
  },
  plugins: [
    // cleans out build dirs prior to rebuilding
    new CleanWebpackPlugin([bundleOutputDir]),
    // ignore codemirror, error caused by summernote
    new webpack.IgnorePlugin(/^codemirror$/),
    new webpack.ProvidePlugin({
      _: 'underscore',
      // `require`ing at the top of this file runs the code in node env
      $: path.resolve(staticJsDir, 'utils', 'studioJquery'),
      jQuery: path.resolve(staticJsDir, 'utils', 'studioJquery'),
      'window.jQuery': path.resolve(staticJsDir, 'utils', 'studioJquery'),
    }),
  ],
  // new in webpack 4. Specifies the default bundle type
  mode: 'development',
};
