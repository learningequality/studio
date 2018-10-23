const path = require('path');

module.exports = {
  globals: {},
  rootDir: path.resolve(__dirname, '../'),
  moduleFileExtensions: ['js', 'json', 'vue'],
  modulePaths: ['<rootDir>/contentcuration/contentcuration/static/js'],
  testURL: 'http://studio.time',
  transform: {
    '^.+\\.js$': '<rootDir>/node_modules/babel-jest',
    '.*\\.(vue)$': '<rootDir>/node_modules/vue-jest',
  },
  transformIgnorePatterns: ["/node_modules/"],
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
