import { mount } from '@vue/test-utils';
import SupplementaryList from '../supplementaryLists/SupplementaryList';
import SupplementaryItem from '../supplementaryLists/SupplementaryItem';
import { factory } from '../../../store';
import Uploader from 'shared/views/files/Uploader';

const testNodeId = 'testnode';
const testFile = { id: 'file-1', language: { id: 'en' }, preset: { id: 'video_subtitle' } };

function makeWrapper() {
  const store = factory();
  return mount(SupplementaryList, {
    store,
    attachToDocument: true,
    propsData: {
      nodeId: testNodeId,
      presetID: 'video_subtitle',
    },
    computed: {
      node() {
        return {
          files: ['file-1', 'file-2'],
        };
      },
      getContentNodeFiles() {
        return () => {
          return [testFile, { id: 'file-2', language: {}, preset: { id: 'high_res_video' } }];
        };
      },
    },
    stubs: {
      SupplementaryItem: true,
    },
  });
}

describe('supplementaryList', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('files should filter files based on presetID', () => {
    expect(wrapper.vm.files).toHaveLength(1);
    expect(wrapper.vm.files[0].id).toBe('file-1');
  });
  it('currentLanguages should reflect languages that have been selected', () => {
    expect(wrapper.vm.currentLanguages).toHaveLength(1);
    expect(wrapper.vm.currentLanguages[0]).toBe('en');
  });
  it('readonly should disable uploading', () => {
    wrapper.setProps({ readonly: true });
    expect(wrapper.find('[data-test="add-file"]').exists()).toBe(false);
  });
  describe('methods', () => {
    it('emitted remove event from list item should call deleteFile action', () => {
      const deleteFile = jest.fn();
      wrapper.setMethods({ deleteFile });
      const listItem = wrapper.find(SupplementaryItem);
      listItem.vm.$emit('remove', 'test');
      expect(deleteFile).toHaveBeenCalled();
      expect(deleteFile.mock.calls[0][0]).toEqual(testFile);
    });
    it('calling uploadCompleteHandler should call updateFile action', () => {
      const updateFile = jest.fn();
      wrapper.setMethods({ updateFile });

      const listItem = wrapper.find(SupplementaryItem);
      const replacementFile = { id: 'replacementFile' };
      listItem.vm.uploadCompleteHandler(replacementFile);
      expect(updateFile).toHaveBeenCalled();
      expect(updateFile.mock.calls[0][0].id).toBe(replacementFile.id);
      expect(updateFile.mock.calls[0][0].language.id).toBe('en');
    });
    it('calling uploadingHandler on Uploader should call updateFile', () => {
      const uploadFile = { id: 'filetest' };
      const updateFile = jest.fn(() => Promise.resolve());
      const uploader = wrapper.find(Uploader);

      wrapper.setMethods({ updateFile });
      wrapper.setData({ selectedLanguage: 'en-PT' });

      uploader.vm.uploadingHandler(uploadFile);

      expect(updateFile).toHaveBeenCalled();
      expect(updateFile.mock.calls[0][0].id).toBe(uploadFile.id);
      expect(updateFile.mock.calls[0][0].language).toBe('en-PT');
    });
  });
  describe('uploading workflow', () => {
    it('clicking add file link should enable language selection', () => {
      wrapper.find('[data-test="add-file"]').trigger('click');
      expect(wrapper.find('[data-test="select-language"]').exists()).toBe(true);
    });
    it('selecting a language should enable file uploading', () => {
      wrapper.setData({ selectedLanguage: 'en' });
      expect(wrapper.find('[data-test="upload-file"]').exists()).toBe(true);
    });
  });
});
