const path = require('path');

const staticFilesDir = '<rootDir>/contentcuration/contentcuration/static';
const staticJsDir = path.join(staticFilesDir, 'js');
const staticLessDir = path.join(staticFilesDir, 'less');
const studioJqueryDir = path.join(staticJsDir, 'utils', 'studioJquery');
const frontendDir = '<rootDir>/contentcuration/contentcuration/frontend';

module.exports = {
  globals: {
    'handlebars-jest': {
      helperDirs: [path.join(staticJsDir, 'handlebars')],
    },
  },
  rootDir: path.resolve(__dirname, '../'),
  moduleFileExtensions: ['js', 'json', 'vue'],
  modulePaths: [frontendDir, staticJsDir, staticLessDir],
  moduleNameMapper: {
    // copied from webpack config aliases
    jquery: studioJqueryDir,
    '^rawJquery$': '<rootDir>/node_modules/jquery',
    '\\.(css|less|styl)$': 'identity-obj-proxy',
    '^frontend/(.*)': '<rootDir>/contentcuration/contentcuration/frontend/$1',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': path.resolve(
      __dirname,
      './fileMock.js',
    ),
  },
  testURL: 'http://studio.time',
  transform: {
    '^.+\\.js$': '<rootDir>/node_modules/babel-jest',
    '.*\\.(vue)$': '<rootDir>/node_modules/vue-jest',
    '.*\\.handlebars$': '<rootDir>/node_modules/handlebars-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!vuetify)'],
  snapshotSerializers: ['<rootDir>/node_modules/jest-serializer-vue'],
  setupFiles: [path.resolve(__dirname, './setup')],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'contentcuration/contentcuration/static/js/**/*.{js,vue}',
    '!contentcuration/contentcuration/static/js/bundles/**',
    '!**/node_modules/**',
  ],
  verbose: false,
};
