/* eslint-env node */

const path = require('path');
const webpack = require('webpack');

const BundleTracker = require('webpack-bundle-tracker');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');

const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const WebpackRTLPlugin = require('webpack-rtl-plugin');
const VuetifyLoaderPlugin = require('vuetify-loader/lib/plugin');

const djangoProjectDir = path.resolve('contentcuration');
const staticFilesDir = path.resolve(djangoProjectDir, 'contentcuration', 'static');
const staticJsDir = path.resolve(staticFilesDir, 'js');
const staticLessDir = path.resolve(staticFilesDir, 'less');
const srcDir = path.resolve(djangoProjectDir, 'contentcuration', 'frontend');

const bundleEntryDir = path.resolve(staticJsDir, 'bundle_modules');
const bundleOutputDir = path.resolve(staticFilesDir, 'studio');

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
  const postCSSLoader = {
    loader: 'postcss-loader',
    options: {
      config: { path: path.resolve(__dirname, './postcss.config.js') },
      sourceMap: dev,
    },
  };
  return {
    context: bundleEntryDir,
    entry: {
      // Use arrays for every entry to allow for hot reloading.
      channel_edit: [
        path.resolve(djangoProjectDir, 'contentcuration', 'frontend/channelEdit/index.js'),
      ],
      channel_list: [
        path.resolve(djangoProjectDir, 'contentcuration', 'frontend/channelList/index.js'),
      ],
      administration: ['./administration.js'],
      settings: ['./settings.js'],
      pdfJSWorker: ['pdfjs-dist/build/pdf.worker.entry.js'],
    },
    output: {
      filename: '[name]-[hash].js',
      path: bundleOutputDir,
      publicPath: dev ? 'http://127.0.0.1:4000/dist/' : undefined,
    },
    devServer: {
      port: 4000,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
    optimization: {
      splitChunks: {
        cacheGroups: {
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
          test: /\.styl(us)?$/,
          use: [hot ? `style-loader` : MiniCssExtractPlugin.loader, `css-loader`, 'stylus-loader'],
        },
        {
          test: /\.less?$/,
          use: [
            hot ? `style-loader` : MiniCssExtractPlugin.loader,
            `css-loader`,
            postCSSLoader,
            'less-loader',
          ],
        },
        {
          test: /\.css?$/,
          use: [hot ? `style-loader` : MiniCssExtractPlugin.loader, `css-loader`, postCSSLoader],
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
        {
          test: /\.(png|jpe?g|gif|svg)$/,
          use: {
            loader: 'url-loader',
            options: { limit: 10000, name: '[name].[ext]?[hash]' },
          },
        },
      ],
    },
    resolve: {
      alias: {
        // explicit alias definitions (rather than modules) for speed
        edit_channel: path.resolve(staticJsDir, 'edit_channel'),
        less: path.resolve(staticJsDir, 'less'),
        utils: path.resolve(staticJsDir, 'utils'),
        shared: path.resolve(srcDir, 'shared'),
        jquery: studioJqueryDir,
        // TODO just use modules alias
        rawJquery: jqueryDir,
      },
      extensions: ['.js', '.vue', '.css', '.less'],
      // carryover of path resolution from build.js
      modules: ['node_modules', staticLessDir],
    },
    plugins: [
      new VueLoaderPlugin(),
      new VuetifyLoaderPlugin(),
      new BundleTracker({
        path: path.resolve(djangoProjectDir, 'build'),
        filename: 'webpack-stats.json',
      }),
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
    ],
    // new in webpack 4. Specifies the default bundle type
    mode: 'development',
  };
};
