import storeFactory from 'shared/vuex/baseStore';

import editModal from 'edit_channel/uploader/vuex/store';
import fileUpload from 'edit_channel/vuexModules/fileUpload';
import contentNodesModule from 'edit_channel/vuexModules/contentNodes';

const store = storeFactory({
  modules: {
    edit_modal: editModal,
    fileUploads: fileUpload,
    topicTree: contentNodesModule,
  },
});

export default store;
