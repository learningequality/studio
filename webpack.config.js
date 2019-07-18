/* eslint-env node */

const path = require('path');
const webpack = require('webpack');

const BundleTracker = require('webpack-bundle-tracker');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const WebpackRTLPlugin = require('webpack-rtl-plugin');

const djangoProjectDir = path.resolve('contentcuration');
const staticFilesDir = path.resolve(djangoProjectDir, 'contentcuration', 'static');
const staticJsDir = path.resolve(staticFilesDir, 'js');
const staticLessDir = path.resolve(staticFilesDir, 'less');

const bundleEntryDir = path.resolve(staticJsDir, 'bundle_modules');
const bundleOutputDir = path.resolve(staticJsDir, 'bundles');

const jqueryDir = path.resolve('node_modules', 'jquery');
const studioJqueryDir = path.resolve(staticJsDir, 'utils', 'studioJquery');

const jsLoaders = [
  {
    loader: 'babel-loader',
    options: {
      // might be able to limit browsers for smaller bundles
      presets: ['env'],
      plugins: ['transform-object-rest-spread'],
    },
  },
];

function recursiveIssuer(m) {
  if (m.issuer) {
    return recursiveIssuer(m.issuer);
  } else if (m.name) {
    return m.name;
  } else {
    return false;
  }
}

// NOTE: Lots of things are handled by webpack4. NODE_ENV, uglify, source-maps
// see: https://medium.com/webpack/webpack-4-mode-and-optimization-5423a6bc597a

module.exports = (env = {}) => {
  const dev = env.dev;
  const hot = env.hot;
  return {
    context: bundleEntryDir,
    entry: {
      // Use arrays for every entry to allow for hot reloading.
      base: ['@babel/polyfill', './base.js'],
      channel_edit: ['./channel_edit.js'],
      channel_list: ['./channel_list.js'],
      administration: ['./administration.js'],
      settings: ['./settings.js'],
      // A simple code sandbox to play with components in
      sandbox: ['./sandbox.js'],
    },
    output: {
      filename: '[name]-[hash].js',
      path: bundleOutputDir,
      publicPath: dev ? 'http://127.0.0.1:3000/dist/' : undefined,
    },
    devServer: {
      port: 3000,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
    optimization: {
      // builds a bundle that holds common code between the 2 entry points
      splitChunks: {
        cacheGroups: {
          commons: {
            name: 'common',
            chunks: 'initial',
            minChunks: 2,
          },
          // Chunk css by bundle, not by dynamic split points.
          // This will add a bit to each bundle, but will mean we don't
          // have to dynamically determine which css bundle to load
          // if we do webpack code splitting.
          // Modified from https://github.com/webpack-contrib/mini-css-extract-plugin#extracting-css-based-on-entry
          baseStyles: {
            name: 'base',
            test: (m, c, entry = 'base') =>
              m.constructor.name === 'CssModule' && recursiveIssuer(m) === entry,
            chunks: 'all',
            enforce: true,
          },
        },
      },
      minimizer: [
        new UglifyJsPlugin({
          cache: true,
          parallel: true,
          sourceMap: true,
        }),
        new OptimizeCSSAssetsPlugin({}),
      ],
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
          use: ['handlebars-template-loader'],
        },
        {
          test: /\.less?$/,
          use: [hot ? `style-loader` : MiniCssExtractPlugin.loader, `css-loader`, 'less-loader'],
        },
        {
          test: /\.css?$/,
          use: [hot ? `style-loader` : MiniCssExtractPlugin.loader, `css-loader`],
        },
        {
          test: /\.vue?$/,
          loader: 'vue-loader',
        },
        // Granular shim for JQuery (used inside of studioJquery)
        {
          test: /(jquery-ui)|(bootstrap.*\.js$)/,
          // NOTE: aliases don't work in dirs outside of this config's context (like boostrap)
          // define="false" bypasses the buggy AMD implementation
          use: `imports-loader?define=>false,$=${jqueryDir},jQuery=${jqueryDir}`,
        },
        // Use url loader to load font files.
        {
          test: /\.(eot|woff|otf|ttf|woff2)$/,
          use: {
            loader: 'url-loader',
            options: { name: '[name].[ext]?[hash]' },
          },
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
        jQuery: 'jquery',
      }),
      new MiniCssExtractPlugin({
        filename: '[name]-[hash].css',
        chunkFilename: '[name]-[hash]-[id].css',
      }),
      new WebpackRTLPlugin(),
      new webpack.SourceMapDevToolPlugin({
        filename: '[name]-[hash].js.map',
      }),
    ],
    // new in webpack 4. Specifies the default bundle type
    mode: 'development',
  };
};
