import storeFactory from 'shared/vuex/baseStore';

const editModal = require('edit_channel/uploader/vuex/store');
const fileUpload = require('edit_channel/vuexModules/fileUpload');
const contentNodesModule = require('edit_channel/vuexModules/contentNodes');

const store = storeFactory({
  modules: {
    edit_modal: editModal,
    fileUploads: fileUpload,
    topicTree: contentNodesModule,
  },
});

export default store;
