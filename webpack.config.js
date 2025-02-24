/* eslint-env node */

const path = require('path');
const process = require('process');
const fs = require('fs');
const { execSync } = require('child_process');
const baseConfig = require('kolibri-tools/lib/webpack.config.base');
const { merge } = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const BundleTracker = require('kolibri-tools/lib/webpackBundleTracker');
const CircularDependencyPlugin = require('circular-dependency-plugin');

const WebpackRTLPlugin = require('kolibri-tools/lib/webpackRtlPlugin');

const { InjectManifest } = require('workbox-webpack-plugin');

const webpack = require('webpack');

// Function to detect if running in WSL
function isWSL() {
  try {
    const version = fs.readFileSync('/proc/version', 'utf8');
    return version.toLowerCase().includes('microsoft');
  } catch (err) {
    return false;
  }
}

// Function to get WSL IP address
function getWSLIP() {
  try {
    const ip = execSync('hostname -I').toString().trim().split(' ')[0];
    return ip;
  } catch (err) {
    console.warn('Failed to get WSL IP address:', err);
    return '127.0.0.1';
  }
}

const djangoProjectDir = path.resolve('contentcuration');
const staticFilesDir = path.resolve(djangoProjectDir, 'contentcuration', 'static');
const srcDir = path.resolve(djangoProjectDir, 'contentcuration', 'frontend');
const dummyModule = path.resolve(srcDir, 'shared', 'styles', 'modulePlaceholder.js')

const bundleOutputDir = path.resolve(staticFilesDir, 'studio');

module.exports = (env = {}) => {
  const dev = env.dev;
  const hot = env.hot;
  const base = baseConfig({ mode: dev ? 'development' : 'production', hot, cache: dev, transpile: !dev });

  if (String(base.module.rules[1].test) !== String(/\.css$/)) {
    throw Error('Check base webpack configuration for update of location of css loader');
  }

  const rootDir = __dirname;
  const rootNodeModules = path.join(rootDir, 'node_modules');
  const baseCssLoaders = base.module.rules[1].use;

  // Determine the appropriate dev server host and public path based on environment
  const isWSLEnvironment = isWSL();
  const devServerHost = isWSLEnvironment ? '0.0.0.0' : '127.0.0.1';
  const devPublicPath = isWSLEnvironment ? 
    `http://${getWSLIP()}:4000/dist/` : 
    'http://127.0.0.1:4000/dist/';

  const workboxPlugin = new InjectManifest({
    swSrc: path.resolve(srcDir, 'serviceWorker/index.js'),
    swDest: 'serviceWorker.js',
    exclude: dev ? [/./] : [/\.map$/, /^manifest.*\.js$/]
  });

  if (dev) {
    // Suppress the "InjectManifest has been called multiple times" warning by reaching into
    // the private properties of the plugin and making sure it never ends up in the state
    // where it makes that warning.
    // https://github.com/GoogleChrome/workbox/blob/v6/packages/workbox-webpack-plugin/src/inject-manifest.ts#L260-L282
    // Solution taken from here:
    // https://github.com/GoogleChrome/workbox/issues/1790#issuecomment-1241356293
    Object.defineProperty(workboxPlugin, "alreadyCalled", {
      get() {
        return false
      },
      set() {
        // do nothing; the internals try to set it to true, which then results in a warning
        // on the next run of webpack.
      },
    })
  }

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
      chunkFilename: '[name]-[id]-[fullhash].js',
      path: bundleOutputDir,
      publicPath: dev ? devPublicPath : '/static/studio/',
      pathinfo: !dev,
    },
    devServer: {
      port: 4000,
      host: devServerHost,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
    module: {
      rules: [
        {
          test: /\.m?js/,
          resolve: {
            fullySpecified: false
          }
        },
        {
          test: /\.styl(us)?$/,
          use: baseCssLoaders.concat('stylus-loader'),
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
      extensions: ['.js', '.vue', '.css'],
      modules: [rootNodeModules],
    },
    resolveLoader: {
      modules: [rootNodeModules],
    },
    plugins: [
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
      workboxPlugin,
    ].concat(
      hot
        ? []
        : [
          new webpack.NormalModuleReplacementPlugin(
            /vuetify\/src\/stylus\//,
            dummyModule
          )
        ]
    ),
    stats: 'normal',
  });
};
