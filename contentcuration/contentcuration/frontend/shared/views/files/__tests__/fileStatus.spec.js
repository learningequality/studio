import { mount } from '@vue/test-utils';
import FileStatus from '../FileStatus.vue';
import storeFactory from 'shared/vuex/baseStore';
import { fileErrors } from 'shared/constants';

const preset = {
  id: 'document',
  supplementary: false,
  order: 2,
};

const fileUploads = {
  'file-1': { id: 'file-1', loaded: 2, total: 2, preset },
  'file-2': { id: 'file-2', loaded: 1, total: 2, preset },
  'file-3': { id: 'file-3', error: fileErrors.NO_STORAGE, preset },
};

function makeWrapper(fileId) {
  const store = storeFactory();
  store.state.file.fileUploadsMap[fileId] = fileUploads[fileId];
  return mount(FileStatus, {
    store,
    attachTo: document.body,
    propsData: {
      fileId,
    },
  });
}

describe('fileStatus', () => {
  it('should indicate if the file has an error', () => {
    let wrapper = makeWrapper('file-3');
    expect(wrapper.vm.hasErrors).toBe(true);

    wrapper = makeWrapper('file-1');
    expect(wrapper.vm.hasErrors).toBe(false);
  });

  it('should indicate if the file is uploading', () => {
    const wrapper = makeWrapper('file-2');
    expect(wrapper.findComponent('[data-test="progress"]').exists()).toBe(true);
  });

  it('should indicate if the file finished uploading', () => {
    const wrapper = makeWrapper('file-1');
    expect(wrapper.findComponent('[data-test="done"]').exists()).toBe(true);
  });
});
