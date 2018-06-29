/* eslint-env node */
const webpack = require('webpack');
const path = require('path');

const CleanWebpackPlugin = require('clean-webpack-plugin');
const BundleTracker = require('webpack-bundle-tracker');
const VueLoaderPlugin = require('vue-loader/lib/plugin')


const djangoProjectDir = path.resolve('contentcuration');
const staticFilesDir = path.resolve(djangoProjectDir, 'contentcuration', 'static');
const staticJsDir = path.resolve(staticFilesDir, 'js');
const staticLessDir = path.resolve(staticFilesDir, 'less');

const bundleEntryDir = path.resolve(staticJsDir, 'bundle_modules');
const bundleOutputDir = path.resolve(staticJsDir,'bundles');

const jqueryDir = path.resolve('node_modules', 'jquery');
const studioJqueryDir = path.resolve(staticJsDir, 'utils', 'studioJquery');

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
    filename: '[name]-[hash].js',
    path: bundleOutputDir,
  },
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
        use: jsLoaders,
      },
      {
        test: /\.handlebars?$/,
        use: [
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
      },
      // Granular shim for JQuery (used inside of studioJquery)
      {
        test: /(jquery-ui)|(bootstrap.*\.js$)/,
        // NOTE: aliases don't work in dirs outside of this config's context (like boostrap)
        // define="false" bypasses the buggy AMD implementation
        use: `imports-loader?define=>false,$=${jqueryDir},jQuery=${jqueryDir}`,
      },
    ],
  },
  resolve: {
    alias: {
      // explicit alias definitions (rather than modules) for speed
      edit_channel: path.resolve(staticJsDir, 'edit_channel'),
      utils: path.resolve(staticJsDir, 'utils'),
      jquery: studioJqueryDir,
      // TODO just use modules alias
      rawJquery: jqueryDir,
    },
    // carryover of path resolution from build.js
    modules: ['node_modules', staticLessDir],
  },
  plugins: [
    // cleans out build dirs prior to rebuilding. Might not be necessary?
    new CleanWebpackPlugin([bundleOutputDir]),
    new VueLoaderPlugin(),
    new BundleTracker({
      path: path.resolve(djangoProjectDir, 'build'),
      filename: 'webpack-stats.json',
    }),
    // ignore codemirror, error caused by summernote
    new webpack.IgnorePlugin(/^codemirror$/),
    new webpack.ProvidePlugin({
      _: 'underscore',
      // used in most of the code we wrote
      $: 'jquery',
      // used in Mathquill, set in jquery
      'window.jQuery': 'jquery',
      'jQuery': 'jquery',
    }),
  ],
  // new in webpack 4. Specifies the default bundle type
  mode: 'development',
};
