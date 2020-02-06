import { mount } from '@vue/test-utils';
import SupplementaryList from '../views/SupplementaryList.vue';
import SupplementaryItem from '../views/SupplementaryItem.vue';
import Uploader from 'edit_channel/sharedComponents/Uploader.vue';

function makeWrapper(props = {}) {
  return mount(SupplementaryList, {
    attachToDocument: true,
    propsData: {
      presetID: 'video_subtitle',
      nodeIndex: 1,
      ...props,
    },
    computed: {
      getNode() {
        return () => {
          return {
            files: [
              { id: 'file-1', language: { id: 'en' }, preset: { id: 'video_subtitle' } },
              { id: 'file-2', language: {}, preset: { id: 'high_res_video' } },
            ],
          };
        };
      },
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
    expect(wrapper.vm.currentLanguages[0].id).toBe('en');
  });
  it('readonly should disable uploading', () => {
    wrapper = makeWrapper({ readonly: true });
    expect(wrapper.find('[data-test="add-file"]').exists()).toBe(false);
  });
  describe('methods', () => {
    it('emitted remove event from list item should call REMOVE_FILE_FROM_NODE', () => {
      let removeFileFromNode = jest.fn();
      wrapper.setMethods({ removeFileFromNode });
      let listItem = wrapper.find(SupplementaryItem);
      listItem.vm.$emit('remove', 'test');
      expect(removeFileFromNode).toHaveBeenCalled();
      expect(removeFileFromNode.mock.calls[0][0].fileID).toBe('test');
      expect(removeFileFromNode.mock.calls[0][0].index).toBe(1);
    });
    it('emitted uploading event from list item should call ADD_FILE_TO_NODE', () => {
      let addFileToNode = jest.fn();
      wrapper.setMethods({ addFileToNode });
      let listItem = wrapper.find(SupplementaryItem);
      listItem.vm.$emit('uploading', { id: 'filetest' });
      expect(addFileToNode).toHaveBeenCalled();
      expect(addFileToNode.mock.calls[0][0].file.id).toBe('filetest');
      expect(addFileToNode.mock.calls[0][0].index).toBe(1);
    });
    it('emitted uploading event from Uploader should call ADD_FILE_TO_NODE', () => {
      let addFileToNode = jest.fn();
      wrapper.setMethods({ addFileToNode });
      let uploader = wrapper.find(Uploader);
      uploader.vm.$emit('uploading', [{ id: 'filetest' }]);
      expect(addFileToNode).toHaveBeenCalled();
      expect(addFileToNode.mock.calls[0][0].file.id).toBe('filetest');
      expect(addFileToNode.mock.calls[0][0].index).toBe(1);
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
