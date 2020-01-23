import Vue from 'vue';
import Vuex, { Store } from 'vuex';

import { mount } from '@vue/test-utils';
import FileUploadItem from '../views/FileUploadItem.vue';
import Uploader from 'edit_channel/sharedComponents/Uploader.vue';
import fileUploadsModule from 'edit_channel/vuexModules/fileUpload';

Vue.use(Vuex);
const store = new Store({
  modules: {
    fileUploads: fileUploadsModule,
  },
});

const testFile = { id: 'test' };
function makeWrapper(props = {}, file = {}) {
  return mount(FileUploadItem, {
    store,
    attachToDocument: true,
    computed: {
      getFile() {
        return () => {
          return file;
        };
      },
    },
    propsData: {
      file:
        file === null
          ? null
          : {
              ...testFile,
              ...file,
            },
      preset: {},
      ...props,
    },
  });
}

describe('fileUploadItem', () => {
  describe('render', () => {
    it('should show a status error if the file has an error', () => {
      let wrapper = makeWrapper({}, { error: { type: 'test' } });
      expect(wrapper.find('[data-test="error-upload-link"]').exists()).toBe(true);
    });
    it('should show an upload button if file is null', () => {
      let wrapper = makeWrapper({}, null);
      expect(wrapper.find('[data-test="upload-link"]').exists()).toBe(true);
    });
    it('should show the remove icon only if allowFileRemove and !viewOnly is false', () => {
      let viewOnlyWrapper = makeWrapper();
      let noRemoveWrapper = makeWrapper({ viewOnly: false });
      let allowRemoveWrapper = makeWrapper({ viewOnly: false, allowFileRemove: true });
      let errorWrapper = makeWrapper({ viewOnly: false }, { error: 'test' });
      expect(viewOnlyWrapper.find('[data-test="remove"]').exists()).toBe(false);
      expect(noRemoveWrapper.find('[data-test="remove"]').exists()).toBe(false);
      expect(allowRemoveWrapper.find('[data-test="remove"]').exists()).toBe(true);
      expect(errorWrapper.find('[data-test="remove"]').exists()).toBe(true);
    });
  });

  describe('props', () => {
    it('allowFileRemove should set whether file can be removed', () => {
      let allowRemoveWrapper = makeWrapper({ allowFileRemove: true, viewOnly: false });
      expect(allowRemoveWrapper.find('[data-test="remove"]').exists()).toBe(true);

      let disallowRemoveWrapper = makeWrapper({ allowFileRemove: false, viewOnly: false });
      expect(disallowRemoveWrapper.find('[data-test="remove"]').exists()).toBe(false);

      let errorWrapper = makeWrapper(
        { allowFileRemove: false, viewOnly: false },
        { error: 'error' }
      );
      expect(errorWrapper.find('[data-test="remove"]').exists()).toBe(true);
    });
    it('viewOnly should set whether file can be edited', () => {
      let viewOnlyWrapper = makeWrapper();
      expect(viewOnlyWrapper.find(Uploader).vm.readonly).toBe(true);

      let editWrapper = makeWrapper({ viewOnly: false });
      expect(editWrapper.find(Uploader).vm.readonly).toBe(false);
    });
  });
  describe('methods', () => {
    let wrapper;
    beforeEach(() => {
      wrapper = makeWrapper();
    });
    it('Uploader emitted uploading event should get emitted with the first file item in the list', () => {
      wrapper.find(Uploader).vm.$emit('uploading', ['file-1', 'file-2']);
      expect(wrapper.emitted('uploading')[0][0]).toBe('file-1');
    });
    it('selecting the item should emit a selected event', () => {
      wrapper.find('[data-test="list-item"]').trigger('click');
      expect(wrapper.emitted('selected')).toHaveLength(1);
    });
    it('clicking an editable item should open a file dialog instead of selecting', () => {
      wrapper.setProps({ viewOnly: false });
      wrapper.find('[data-test="list-item"]').trigger('click');
      expect(wrapper.emitted('selected')).toBeUndefined();
    });
    it('clicking remove icon should emit a remove event', () => {
      wrapper.setProps({ viewOnly: false, allowFileRemove: true });
      wrapper.find('[data-test="remove"]').trigger('click');
      expect(wrapper.emitted('remove')[0][0]).toBe('test');
    });
  });
});
