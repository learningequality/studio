const channelModule = {
  state: {
    contentTags: [],
    canEdit: false,
  },
  getters: {
    contentTags(state) {
      return state.contentTags;
    },
    canEdit(state) {
      return state.canEdit;
    },
  },
  mutations: {
    SET_EDIT_MODE(state, canEdit) {
      state.canEdit = canEdit;
    },
    SET_CONTENT_TAGS(state, contentTags) {
      state.contentTags = contentTags || [];
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
