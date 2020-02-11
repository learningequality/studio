export default {
  namespaced: true,
  state: () => ({
    currentChannelId: '00000000000000000000000000000000',
  }),
  getters: {
    currentChannel() {
      return { name: 'test', deleted: false, edit: true, content_defaults: {} };
    },
    canEdit() {
      return true;
    },
    rootId() {
      return '00000000000000000000000000000000';
    },
  },
};
