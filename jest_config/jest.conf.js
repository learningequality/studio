const path = require('path');

const frontendDir = '<rootDir>/contentcuration/contentcuration/frontend';

module.exports = {
  rootDir: path.resolve(__dirname, '../'),
  moduleFileExtensions: ['js', 'json', 'vue'],
  modulePaths: [frontendDir],
  moduleNameMapper: {
    '\\.(css|less|styl)$': 'identity-obj-proxy',
    '^frontend/(.*)': '<rootDir>/contentcuration/contentcuration/frontend/$1',
    '^static/(.*)': '<rootDir>/contentcuration/contentcuration/static/$1',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': path.resolve(
      __dirname,
      './globalMocks/fileMock.js'
    ),
    '\\.worker.min.js': path.resolve(__dirname, './globalMocks/fileMock.js'),
    'shared/client': path.resolve(__dirname, './globalMocks/client.js'),
    'shared/urls': path.resolve(__dirname, './globalMocks/urls.js'),
  },
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  testURL: 'http://studio.time',
  transform: {
    '^.+\\.js$': '<rootDir>/node_modules/babel-jest',
    '.*\\.(vue)$': '<rootDir>/node_modules/vue-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!vuetify|epubjs|kolibri-design-system|kolibri-constants|axios)'],
  snapshotSerializers: ['<rootDir>/node_modules/jest-serializer-vue'],
  setupFilesAfterEnv: ['<rootDir>/jest_config/setup.js'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: ['!**/node_modules/**'],
  verbose: false,
};
