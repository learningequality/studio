// import * as editModal from 'edit_channel/uploader/vuex/store';
import template from './vuex/template';
import assessmentItem from './vuex/assessmentItem';
import contentNode from './vuex/contentNode';
import file from './vuex/file';
import currentChannel from './vuex/currentChannel';
import importFromChannels from './vuex/importFromChannels';
import task from './vuex/task';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory({
  modules: {
    task,
    template,
    assessmentItem,
    contentNode,
    currentChannel,
    importFromChannels,
    file,
  },
});

export default store;
