const channelModule = {
  state: {
    contentTags: []
  },
  getters: {
    contentTags(state) {
      return state.contentTags;
    },
  },
  mutations: {
    SET_CONTENT_TAGS(state, contentTags) {
      state.contentTags = contentTags;
    },
    ADD_CONTENT_TAG(state, contentTag) {
      state.contentTags.push(contentTag);
    },
    REMOVE_CONTENT_TAG_BY_NAME(state, tagName) {
      state.contentTags.splice(state.contentTags.findIndex(tag => tag.tag_name === tagName), 1);
    },
  },
};

module.exports = channelModule;
