import Vue from 'vue';
import Vuex, { Store } from 'vuex';

import { mount } from '@vue/test-utils';
import FileStatus from '../views/FileStatus.vue';
import fileUploadsModule from 'edit_channel/vuexModules/fileUpload';

Vue.use(Vuex);
const store = new Store({
  modules: {
    fileUploads: fileUploadsModule,
  },
});

const files = {
  'file-1': { progress: 100 },
  'file-2': { progress: 50 },
  'file-3': { progress: 100, error: 'error' },
};

function makeWrapper(fileIDs) {
  return mount(FileStatus, {
    store,
    attachToDocument: true,
    propsData: {
      fileIDs: fileIDs,
    },
    computed: {
      files() {
        return files;
      },
    },
  });
}

describe('fileStatus', () => {
  it('should indicate if one of the files has an error', () => {
    let wrapper = makeWrapper(['file-1', 'file-2', 'file-3']);
    expect(wrapper.vm.hasErrors).toBe(true);

    wrapper = makeWrapper(['file-1', 'file-2']);
    expect(wrapper.vm.hasErrors).toBe(false);
  });
  it('should indicate if one of the files is uploading', () => {
    let wrapper = makeWrapper(['file-1', 'file-2', 'file-3']);
    expect(wrapper.vm.progress < 100).toBe(true);
  });
  it('should indicate if all files have finished uploading', () => {
    let wrapper = makeWrapper(['file-1', 'file-3']);
    expect(wrapper.vm.progress).toBe(100);
  });
});
