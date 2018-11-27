var mutations = require('./mutations');
var actions = require('./actions');
var getters = require('./getters');
var { PageTypes, ImportStatus } = require('../constants');

module.exports = {
  namespaced: true,
  state: {
    youtubeData: null,
    youtubeURL: "",
    resolutions: [],
    importStatus: ImportStatus.IDLE,
    importNodes: null,
    parentID: null,
    pageState: {
      pageType: PageTypes.SUBMIT_URL,
      data: {},
    }
  },
  actions: actions,
  mutations: mutations,
  getters: getters,
};
