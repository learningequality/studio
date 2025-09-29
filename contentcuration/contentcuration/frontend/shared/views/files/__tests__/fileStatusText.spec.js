import { mount } from '@vue/test-utils';
import FileStatusText from '../FileStatusText.vue';
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
  'file-3': { id: 'file-3', error: fileErrors.UPLOAD_FAILED, preset },
};

function makeWrapper(fileId) {
  const store = storeFactory();
  store.state.file.fileUploadsMap[fileId] = fileUploads[fileId];
  return mount(FileStatusText, {
    store,
    attachTo: document.body,
    propsData: {
      fileId,
    },
  });
}

describe('fileStatusText', () => {
  it('should show error text if a file has an error', () => {
    let wrapper = makeWrapper('file-3');
    expect(wrapper.findComponent('[data-test="error"]').exists()).toBe(true);
    expect(wrapper.findComponent('[data-test="progress"]').exists()).toBe(false);

    wrapper = makeWrapper('file-1');
    expect(wrapper.findComponent('[data-test="error"]').exists()).toBe(false);
  });

  it('should hide upload link in readonly mode', async () => {
    const wrapper = makeWrapper('file-2');
    await wrapper.setProps({ readonly: true });
    expect(wrapper.findComponent('[data-test="upload"]').exists()).toBe(false);
  });

  it('should indicate if one of the files is uploading', () => {
    const wrapper = makeWrapper('file-2');
    expect(wrapper.findComponent('[data-test="progress"]').exists()).toBe(true);
  });

  it('should show nothing if files are done uploading', () => {
    const wrapper = makeWrapper('file-1');
    expect(wrapper.findComponent('[data-test="error"]').exists()).toBe(false);
    expect(wrapper.findComponent('[data-test="progress"]').exists()).toBe(false);
  });
});
