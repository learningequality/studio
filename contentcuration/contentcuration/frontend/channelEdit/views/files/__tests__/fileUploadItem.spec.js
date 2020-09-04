import { mount } from '@vue/test-utils';
import FileUploadItem from '../FileUploadItem';
import store from '../../../store';
import Uploader from 'shared/views/files/Uploader';

const testFile = { id: 'test' };
function makeWrapper(props = {}, file = {}) {
  return mount(FileUploadItem, {
    store,
    attachToDocument: true,
    propsData: {
      file:
        file === null
          ? null
          : {
              ...testFile,
              ...file,
            },
      preset: {
        id: 'document',
        kind_id: 'document',
        display: true,
      },
      ...props,
    },
  });
}

describe('fileUploadItem', () => {
  describe('render', () => {
    it('should show a status error if the file has an error', () => {
      let wrapper = makeWrapper({}, { error: true });
      expect(wrapper.find('[data-test="status"]').exists()).toBe(true);
    });
    it('should show an upload button if file is null', () => {
      let wrapper = makeWrapper({}, null);
      expect(wrapper.find('[data-test="upload-link"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="radio"]').exists()).toBe(false);
    });
  });

  describe('props', () => {
    it('should show the remove icon only if allowFileRemove', () => {
      let noRemoveWrapper = makeWrapper();
      expect(noRemoveWrapper.find('[data-test="remove"]').exists()).toBe(false);

      let allowRemoveWrapper = makeWrapper({ allowFileRemove: true });
      expect(allowRemoveWrapper.find('[data-test="remove"]').exists()).toBe(true);
    });
  });
  describe('methods', () => {
    let wrapper;
    beforeEach(() => {
      wrapper = makeWrapper();
    });
    it('Uploader emitted uploading event should get emitted with emitted file', () => {
      const file = {
        checksum: 'file-1',
      };
      wrapper.find(Uploader).vm.$emit('uploading', file);
      expect(wrapper.emitted('uploading')[0][0]).toBe(file);
    });
    it('clicking an editable item should open a file dialog', () => {
      wrapper.find('[data-test="list-item"]').trigger('click');
      expect(wrapper.emitted('selected')).toBeUndefined();
    });
    it('clicking remove icon should emit a remove event', () => {
      wrapper.setProps({ allowFileRemove: true });
      wrapper.find('[data-test="remove"]').trigger('click');
      expect(wrapper.emitted('remove')[0][0].id).toBe('test');
    });
  });
});
