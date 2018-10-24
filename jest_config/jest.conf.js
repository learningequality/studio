const path = require('path');

const staticFilesDir = '<rootDir>/contentcuration/contentcuration/static';
const staticJsDir = path.join(staticFilesDir, 'js');
const staticLessDir = path.join(staticFilesDir, 'less');
const studioJqueryDir = path.join(staticJsDir, 'utils', 'studioJquery');

module.exports = {
  globals: {
    "handlebars-jest": {
      helperDirs: [
        path.join(staticJsDir, 'handlebars')
      ],
    }
  },
  rootDir: path.resolve(__dirname, '../'),
  moduleFileExtensions: ['js', 'json', 'vue'],
  modulePaths: [staticJsDir, staticLessDir],
  moduleNameMapper: {
    // copied from webpack config aliases
    jquery: studioJqueryDir,
    '^rawJquery$': '<rootDir>/node_modules/jquery',
    '\\.(css|less)$': path.resolve(__dirname, './styleMock.js'),
  },
  testURL: 'http://studio.time',
  transform: {
    '^.+\\.js$': '<rootDir>/node_modules/babel-jest',
    '.*\\.(vue)$': '<rootDir>/node_modules/vue-jest',
    '.*\\.handlebars$': '<rootDir>/node_modules/handlebars-jest',
  },
  transformIgnorePatterns: ['/node_modules/'],
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
