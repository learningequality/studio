import Vue from 'vue';
import Vuex, { Store } from 'vuex';

import { mount } from '@vue/test-utils';
import SupplementaryItem from '../views/SupplementaryItem.vue';
import Uploader from 'edit_channel/sharedComponents/Uploader.vue';
import fileUploadsModule from 'edit_channel/vuexModules/fileUpload';

Vue.use(Vuex);
const store = new Store({
  modules: {
    fileUploads: fileUploadsModule,
  },
});

function makeWrapper(props = {}) {
  return mount(SupplementaryItem, {
    store,
    attachToDocument: true,
    propsData: {
      file: {
        language: {
          id: 'en',
        },
      },
      ...props,
    },
    computed: {
      uploadStatus() {
        return '';
      },
    },
  });
}

describe('supplementaryItem', () => {
  it('setting readonly should disable uploading', () => {
    let wrapper = makeWrapper({ readonly: true });
    expect(wrapper.find('[data-test="upload-file"]').exists()).toBe(false);
  });
  it('setting readonly should disable removing', () => {
    let wrapper = makeWrapper({ readonly: true });
    expect(wrapper.find('[data-test="remove"]').exists()).toBe(false);
  });
  it('should emit an uploading event when Uploader starts uploading file', () => {
    let wrapper = makeWrapper();
    wrapper.find(Uploader).vm.$emit('uploading', [{ id: 'file1' }, { id: 'file2' }]);
    expect(wrapper.emitted('uploading')[0][0].id).toBe('file1');
    expect(wrapper.emitted('uploading')[0][0].language.id).toBe('en');
  });
  it('uploading should be true if progress < 100', () => {
    let wrapper = makeWrapper({ file: { progress: 50, language: {} } });
    expect(wrapper.vm.uploading).toBe(true);
  });
  it('should disable ability to upload other files during a file upload', () => {
    let wrapper = makeWrapper({ file: { progress: 50, language: {} } });
    expect(wrapper.find('[data-test="upload-file"]').exists()).toBe(false);
  });
  it('clicking remove button should emit remove event with file id', () => {
    let wrapper = makeWrapper({ file: { id: 'test-remove', language: {} } });
    wrapper.find('[data-test="remove"]').trigger('click');
    expect(wrapper.emitted('remove')[0][0]).toBe('test-remove');
  });
});
