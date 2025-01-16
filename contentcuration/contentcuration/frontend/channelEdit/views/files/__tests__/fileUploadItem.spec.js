import { mount } from '@vue/test-utils';
import FileUploadItem from '../FileUploadItem';
import { factory } from '../../../store';
import Uploader from 'shared/views/files/Uploader';

const testFile = { id: 'test' };
function makeWrapper(props = {}, file = {}, computed = {}) {
  const store = factory();
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
    computed,
  });
}

describe('fileUploadItem', () => {
  describe('render', () => {
    it("'Unknown filename' should be displayed if original_filename is 'file'", () => {
      const file = {
        original_filename: 'file',
      };
      const wrapper = makeWrapper({}, file);
      expect(wrapper.find('[data-test="file-name"]').text()).toBe('Unknown filename');
    });
    it("'Unknown filename' should be displayed if original_filename is ''", () => {
      const file = {
        original_filename: '',
      };
      const wrapper = makeWrapper({}, file);
      expect(wrapper.find('[data-test="file-name"]').text()).toBe('Unknown filename');
    });
    it("original_filename should be displayed if its value is not 'file'", () => {
      const file = {
        id: 'file-1',
        original_filename: 'SomeFileName',
      };
      const wrapper = makeWrapper({}, file);
      expect(wrapper.find('[data-test="file-name"]').text()).toBe('SomeFileName');
    });
    it('should show a status error if the file has an error', () => {
      const wrapper = makeWrapper({}, { error: true });
      expect(wrapper.find('[data-test="status"]').exists()).toBe(true);
    });
    it('should show an upload button if file is null', () => {
      const wrapper = makeWrapper({}, null);
      expect(wrapper.find('[data-test="upload-link"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="radio"]').exists()).toBe(false);
    });
  });

  describe('props', () => {
    it('should show the remove menu option only if allowFileRemove', () => {
      const noRemoveWrapper = makeWrapper();
      expect(noRemoveWrapper.find('[data-test="remove-file"]').exists()).toBe(false);

      const allowRemoveWrapper = makeWrapper({ allowFileRemove: true });
      expect(allowRemoveWrapper.find('[data-test="remove-file"]').exists()).toBe(true);
    });
  });
  describe('computed', () => {
    it('should show all menu options only if fileDisplay', () => {
      let wrapper = makeWrapper(
        {},
        {},
        {
          fileDisplay() {
            return false;
          },
        }
      );
      expect(wrapper.find('[data-test="replace-file"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="remove-file"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="download-file"]').exists()).toBe(false);

      wrapper = makeWrapper(
        {
          allowFileRemove: true,
        },
        {},
        {
          fileDisplay() {
            return true;
          },
        }
      );
      expect(wrapper.find('[data-test="replace-file"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="remove-file"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="download-file"]').exists()).toBe(true);
    });
  });
  describe('methods', () => {
    let wrapper;
    beforeEach(() => {
      wrapper = makeWrapper();
    });
    it('Uploader uploadingHandler should call uploadingHandler with file', () => {
      const file = {
        id: 'file-1',
      };
      const uploadingHandler = jest.fn();
      wrapper.setMethods({ uploadingHandler });
      wrapper.find(Uploader).vm.uploadingHandler(file);
      expect(uploadingHandler).toHaveBeenCalledWith(file);
    });
    it('Uploader uploadCompleteHandler should call uploadCompleteHandler with file', () => {
      const file = {
        id: 'file-1',
      };
      const uploadCompleteHandler = jest.fn();
      wrapper.setProps({ uploadCompleteHandler });
      wrapper.setData({ fileUploadId: file.id });
      wrapper.find(Uploader).vm.uploadCompleteHandler(file);
      expect(uploadCompleteHandler).toHaveBeenCalledWith(file);
    });
    it('clicking a list item should emit a selected event if a file is available', () => {
      wrapper.find('[data-test="list-item"]').trigger('click');
      expect(wrapper.emitted('selected')).not.toBeUndefined();
    });
    it('clicking a list item should open the file dialog if file is not available', () => {
      wrapper = makeWrapper({}, null);
      wrapper.find('[data-test="list-item"]').trigger('click');
      expect(wrapper.emitted('selected')).toBeUndefined();
    });
    it('clicking remove menu option should emit a remove event', () => {
      wrapper.setProps({ allowFileRemove: true });
      wrapper.find('[data-test="remove-file"]').trigger('click');
      expect(wrapper.emitted('remove')[0][0].id).toBe('test');
    });
    it('clicking replace menu option should emit a selected event', () => {
      wrapper.find('[data-test="replace-file"]').trigger('click');
      expect(wrapper.emitted('selected')).not.toBeUndefined();
    });
    it('clicking download menu option should call open file', () => {
      window.open = jest.fn();

      wrapper = makeWrapper({
        file: { id: 1, url: 'path/to/file.pdf' },
      });
      wrapper.find('[data-test="download-file"]').trigger('click');
      expect(window.open).toHaveBeenCalledWith('path/to/file.pdf', '_blank');
    });
  });
});
