import { mount } from '@vue/test-utils';
import FileStatus from '../FileStatus.vue';
import storeFactory from 'shared/vuex/baseStore';
import { fileErrors } from 'shared/constants';

const fileUploads = {
  'file-1': { checksum: 'file-1', loaded: 2, total: 2 },
  'file-2': { checksum: 'file-2', loaded: 1, total: 2 },
  'file-3': { checksum: 'file-3', error: fileErrors.NO_STORAGE },
};

function makeWrapper(checksum) {
  const store = storeFactory();
  store.state.file.fileUploadsMap[checksum] = fileUploads[checksum];
  return mount(FileStatus, {
    store,
    attachToDocument: true,
    propsData: {
      checksum,
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
    let wrapper = makeWrapper('file-2');
    expect(wrapper.find('[data-test="progress"]').exists()).toBe(true);
  });
  it('should indicate if the file finished uploading', () => {
    let wrapper = makeWrapper('file-1');
    expect(wrapper.find('[data-test="done"]').exists()).toBe(true);
  });
});
