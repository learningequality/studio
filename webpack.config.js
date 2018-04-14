/* eslint-env node */
// const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

const staticFilesDir = path.resolve('contentcuration', 'contentcuration', 'static');
const staticJsDir = path.resolve(staticFilesDir, 'js');
const staticLessDir = path.resolve(staticFilesDir, 'less');

const bundleEntryDir = path.resolve(staticJsDir, 'bundle_modules');
const bundleOutputDir = path.resolve(staticJsDir,'bundles');

const jsLoaders = [
  { loader: 'babel-loader' }
];

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
  // add source maps for use in chrome for debugging
  devtool: 'inline-source-map',
  // builds a bundle that holds common code between the 2 entry points
  optimization: {
    splitChunks: {
      cacheGroups: {
          commons: {
              name: "commons",
              chunks: "initial",
              minChunks: 2
          }
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        use:jsLoaders,
      },
      {
        test: /\.handlebars?$/,
        use:[
          'handlebars-loader',
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
        test: /\.vue$/,
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
      $: 'jquery',
      jQuery: 'jquery',
    }),
    // uglify the code, used in prod. More limited source maps
    // new UglifyJsPlugin(),
  ],
};
