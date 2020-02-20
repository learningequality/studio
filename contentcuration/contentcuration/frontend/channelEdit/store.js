// import * as editModal from 'edit_channel/uploader/vuex/store';
import template from './vuex/template';
import assessmentItem from './vuex/assessmentItem';
import contentNode from './vuex/contentNode';
import file from './vuex/file';
import currentChannel from './vuex/currentChannel';
import storeFactory from 'shared/vuex/baseStore';

import * as asyncTaskModule from 'edit_channel/vuexModules/asyncTask';

const store = storeFactory({
  modules: {
    // topicTree: contentNodesModule,
    asyncTask: asyncTaskModule,
    template,
    assessmentItem,
    contentNode,
    currentChannel,
    file,
  },
});

export default store;
