/* eslint-env node */

const path = require('path');
const process = require('process');
const baseConfig = require('kolibri-tools/lib/webpack.config.base');
const { merge } = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const BundleTracker = require('kolibri-tools/lib/webpackBundleTracker');
const CircularDependencyPlugin = require('circular-dependency-plugin');

const WebpackRTLPlugin = require('kolibri-tools/lib/webpackRtlPlugin');

const { InjectManifest } = require('workbox-webpack-plugin');

const webpack = require('webpack');

const djangoProjectDir = path.resolve('contentcuration');
const staticFilesDir = path.resolve(djangoProjectDir, 'contentcuration', 'static');
const srcDir = path.resolve(djangoProjectDir, 'contentcuration', 'frontend');

const bundleOutputDir = path.resolve(staticFilesDir, 'studio');

module.exports = (env = {}) => {
  const dev = env.dev;
  const hot = env.hot;
  const base = baseConfig({ mode: dev ? 'development' : 'production', hot, cache: dev });

  if (String(base.module.rules[2].test) !== String(/\.css$/)) {
    throw Error('Check base webpack configuration for update of location of css loader');
  }

  const rootDir = __dirname;

  const rootNodeModules = path.join(rootDir, 'node_modules');

  const baseCssLoaders = base.module.rules[2].use;

  return merge(base, {
    context: srcDir,
    entry: {
      // Use arrays for every entry to allow for hot reloading.
      channel_edit: ['./channelEdit/index.js'],
      channel_list: ['./channelList/index.js'],
      settings: ['./settings/index.js'],
      accounts: ['./accounts/index.js'],
      administration: ['./administration/index.js'],
      // A simple code sandbox to play with components in
      pdfJSWorker: ['pdfjs-dist/build/pdf.worker.entry.js'],
      // Utility for taking screenshots inside an iframe sandbox
      htmlScreenshot: ['./shared/utils/htmlScreenshot.js'],
    },
    output: {
      filename: dev ? '[name].js' : '[name]-[fullhash].js',
      chunkFilename: dev ? '[name]-[id].js' : '[name]-[id]-[fullhash].js',
      path: bundleOutputDir,
      publicPath: dev ? 'http://127.0.0.1:4000/dist/' : '/static/studio/',
      pathinfo: !dev,
    },
    devServer: {
      port: 4000,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
    module: {
      rules: [
        {
          test: /\.styl(us)?$/,
          use: baseCssLoaders.concat('stylus-loader'),
        },
        {
          test: /\.less?$/,
          use: baseCssLoaders.concat('less-loader'),
        },
      ],
    },
    resolve: {
      alias: {
        // explicit alias definitions (rather than modules) for speed
        shared: path.resolve(srcDir, 'shared'),
        frontend: srcDir,
        // needed to reference Vuetify styles in the shadow DOM
        vuetify: path.resolve('node_modules', 'vuetify'),
        static: staticFilesDir,
      },
      extensions: ['.js', '.vue', '.css', '.less'],
      modules: [rootNodeModules],
    },
    resolveLoader: {
      modules: [rootNodeModules],
    },
    plugins: [
      new webpack.IgnorePlugin({
        resourceRegExp: /vuetify\/src\/stylus\//,
      }),
      new BundleTracker({
        filename: path.resolve(djangoProjectDir, 'build', 'webpack-stats.json'),
      }),
      new MiniCssExtractPlugin({
        filename: dev ? '[name].css' :'[name]-[fullhash].css',
        chunkFilename: dev ? '[name]-[id].css' :'[name]-[fullhash]-[id].css',
      }),
      new WebpackRTLPlugin({
        minify: false,
      }),
      new CircularDependencyPlugin({
        // exclude detection of files based on a RegExp
        exclude: /a\.js|node_modules/,
        // include specific files based on a RegExp
        include: /frontend/,
        // add errors to webpack instead of warnings
        failOnError: false,
        // allow import cycles that include an asyncronous import,
        // e.g. via import(/* webpackMode: "weak" */ './file.js')
        allowAsyncCycles: false,
        // set the current working directory for displaying module paths
        cwd: process.cwd(),
      }),
      // This must be added in dev mode if you want to do dev work
      // on the service worker.
    ].concat(
      dev
        ? []
        : [
            new InjectManifest({
              swSrc: path.resolve(srcDir, 'serviceWorker/index.js'),
              swDest: 'serviceWorker.js',
            }),
          ]
    ),
    stats: 'normal',
  });
};
