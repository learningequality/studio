var mutations = require('./importMutations');
var actions = require('./importActions');
var getters = require('./importGetters');

module.exports = {
  namespaced: true,
  state: {
    // An array of JSON-ified ContentNode Models, which is updated
    // whenever a user selects a Node to import
    itemsToImport: [],
    // start | show_warning | finish | null
    importStatus: null,
    importSizeInBytes: 0,
    // Top-level importable channels
    channelsAreLoading: false,
    channels: [],
    pageState: {
      pageType: 'tree_view',
      data: {},
    }
  },
  actions: actions,
  mutations: mutations,
  getters: getters,
};
