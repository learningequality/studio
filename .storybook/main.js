const VuetifyLoaderPlugin = require('vuetify-loader/lib/plugin');

const studioWebpackConfig = require('../webpack.config')({ hot: true });

module.exports = {
  stories: ['../contentcuration/contentcuration/frontend/**/*.stories.js'],
  webpackFinal: config => {
    return {
      ...config,
      module: {
        ...config.module,
        rules: studioWebpackConfig.module.rules,
      },
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve.alias,
          ...studioWebpackConfig.resolve.alias,
        },
        extensions: studioWebpackConfig.resolve.extensions,
      },
      plugins: [new VuetifyLoaderPlugin(), ...config.plugins],
    };
  },
};
