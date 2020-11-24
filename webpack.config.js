/* eslint-env node */

const path = require('path');
const webpack = require('webpack');

const BundleTracker = require('webpack-bundle-tracker');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');

const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const WebpackRTLPlugin = require('webpack-rtl-plugin');
const VuetifyLoaderPlugin = require('vuetify-loader/lib/plugin');

const djangoProjectDir = path.resolve('contentcuration');
const staticFilesDir = path.resolve(djangoProjectDir, 'contentcuration', 'static');
const staticLessDir = path.resolve(staticFilesDir, 'less');
const srcDir = path.resolve(djangoProjectDir, 'contentcuration', 'frontend');

const bundleOutputDir = path.resolve(staticFilesDir, 'studio');

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
  const cssInsertionLoader = hot ? 'style-loader' : MiniCssExtractPlugin.loader;
  const cssLoader = {
    loader: 'css-loader',
    options: { minimize: !dev, sourceMap: dev },
  };
  // for scss blocks
  const sassLoaders = [
    cssInsertionLoader,
    cssLoader,
    postCSSLoader,
    {
      loader: 'sass-loader',
    },
  ];
  return {
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
      filename: '[name]-[hash].js',
      path: bundleOutputDir,
      publicPath: dev ? 'http://127.0.0.1:4000/dist/' : '/static/studio/',
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
        new TerserPlugin({
          cache: true,
          parallel: true,
          sourceMap: true,
          terserOptions: {
            mangle: false,
            safari10: false,
            output: {
              comments: false,
            },
          },
        }),
        new OptimizeCSSAssetsPlugin({}),
      ],
    },
    module: {
      rules: [
        {
          test: /\.js?$/,
          exclude: /node_modules\/(?!(kolibri-design-system)\/).*/,
          use: ['babel-loader'],
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
        {
          test: /\.s[a|c]ss$/,
          use: sassLoaders,
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
      },
      extensions: ['.js', '.vue', '.css', '.less'],
      // carryover of path resolution from build.js
      modules: ['node_modules', staticLessDir],
    },
    devtool: 'cheap-module-source-map',
    plugins: [
      new VueLoaderPlugin(),
      new VuetifyLoaderPlugin(),
      new BundleTracker({
        path: path.resolve(djangoProjectDir, 'build'),
        filename: 'webpack-stats.json',
      }),
      new webpack.ProvidePlugin({
        // used in Mathquill, set in jquery
        'window.jQuery': 'jquery',
        jQuery: 'jquery',
      }),
      new MiniCssExtractPlugin({
        filename: '[name]-[hash].css',
        chunkFilename: '[name]-[hash]-[id].css',
      }),
      new WebpackRTLPlugin(),
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
