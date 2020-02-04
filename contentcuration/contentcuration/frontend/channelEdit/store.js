import storeFactory from 'shared/vuex/baseStore';

import * as editModal from 'edit_channel/uploader/vuex/store';
import * as fileUpload from 'edit_channel/vuexModules/fileUpload';
import * as contentNodesModule from 'edit_channel/vuexModules/contentNodes';
import * as asyncTaskModule from 'edit_channel/vuexModules/asyncTask';

const store = storeFactory({
  modules: {
    edit_modal: editModal,
    fileUploads: fileUpload,
    topicTree: contentNodesModule,
    asyncTask: asyncTaskModule,
  },
});

export default store;
