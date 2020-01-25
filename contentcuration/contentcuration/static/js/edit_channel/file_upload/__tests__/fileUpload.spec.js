import Vue from 'vue';
import Vuex, { Store } from 'vuex';

import { mount } from '@vue/test-utils';
import FileUpload from '../views/FileUpload.vue';
import FileUploadItem from '../views/FileUploadItem.vue';
import fileUploadsModule from 'edit_channel/vuexModules/fileUpload';

Vue.use(Vuex);
const store = new Store({
  modules: {
    fileUploads: fileUploadsModule,
  },
});

const testFiles = [
  {
    id: 'file-1',
    preset: {
      id: 'document',
      supplementary: false,
    },
  },
  {
    id: 'file-2',
    preset: {
      id: 'document_thumbnail',
      supplementary: true,
    },
  },
  {
    id: 'file-3',
    preset: {
      id: 'epub',
      error: 'error',
      supplementary: true,
    },
  },
];

function makeWrapper(files) {
  files.forEach(f => {
    f.checksum = 'checksum';
    f.file_on_disk = 'path';
    f.file_format = 'mp3';
  });
  return mount(FileUpload, {
    store,
    attachToDocument: true,
    propsData: {
      nodeIndex: 1,
    },
    computed: {
      node() {
        return { kind: 'document', files, title: 'test' };
      },
    },
  });
}

describe('fileUpload', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper(testFiles, {
      propsData: {
        viewOnly: false,
      },
      stubs: {
        FilePreview: true,
      },
    });
  });
  describe('computed', () => {
    it('should map the files to the correct presets', () => {
      expect(wrapper.vm.primaryFileMapping[0].file.id).toBe('file-3');
      expect(wrapper.vm.primaryFileMapping[1].file.id).toBe('file-1');
      expect(wrapper.vm.primaryFileMapping).toHaveLength(2);
    });
    it('should disallow file removal if there is only one primary file', () => {
      let testFiles2 = [
        {
          id: 'file-1',
          preset: {
            id: 'document',
            supplementary: false,
          },
        },
      ];
      let testWrapper = makeWrapper(testFiles2);
      expect(testWrapper.vm.allowFileRemove).toBe(false);
    });
    it('should disallow file removal if there is only one valid primary file', () => {
      expect(wrapper.vm.allowFileRemove).toBe(false);
    });
    it('should allow file removal if there are multiple valid primary files', () => {
      let testFiles2 = [
        { id: 'file-1', preset: { id: 'document' } },
        { id: 'file-2', preset: { id: 'epub' } },
      ];
      let testWrapper = makeWrapper(testFiles2);
      expect(testWrapper.vm.allowFileRemove).toBe(true);
    });
    it('should calculate the number of valid primary files', () => {
      expect(wrapper.vm.fileCount).toBe(1);
    });
    it('should show an error if the node kind is unrecognized', () => {
      let testWrapper = mount(FileUpload, {
        store,
        attachToDocument: true,
        propsData: {
          nodeIndex: 1,
        },
        computed: {
          node() {
            return { kind: 'something', files: [], title: 'test' };
          },
        },
      });
      expect(testWrapper.find('[data-test="error"]').exists()).toBe(true);
    });
  });
  describe('methods', () => {
    let uploadItem;
    beforeEach(() => {
      uploadItem = wrapper.findAll(FileUploadItem).at(1);
    });
    it('should automatically select the first file on load', () => {
      expect(wrapper.vm.selected).toBe('file-3');
    });
    it('selectPreview should select the preview when items are selected in the list', () => {
      uploadItem.vm.$emit('selected');
      expect(wrapper.vm.selected).toBe('file-1');
    });
    it('selectPreview should select the preview when radio buttons are checked in the list', () => {
      uploadItem.setProps({ viewOnly: false });
      uploadItem.find('.v-input--selection-controls__input').trigger('click');
      expect(wrapper.vm.selected).toBe('file-1');
    });
    it('isSelected should return the selected file', () => {
      let testFiles2 = [
        { id: 'file-1', preset: { id: 'document' } },
        { id: 'file-2', preset: { id: 'epub' } },
      ];
      let testWrapper = makeWrapper(testFiles2);
      testFiles2.forEach(file => {
        expect(testWrapper.vm.isSelected({ file })).toBe(file.id === 'file-2');
      });
    });
    it('emitted remove event should trigger remove file from node', () => {
      let removeFileFromNode = jest.fn();
      let selectFirstFile = jest.fn();
      wrapper.setMethods({ removeFileFromNode, selectFirstFile });
      uploadItem.vm.$emit('remove', 'file-3');
      expect(removeFileFromNode).toHaveBeenCalled();
      expect(removeFileFromNode.mock.calls[0][0].fileID).toBe('file-3');

      // Should select the next available file
      expect(selectFirstFile).toHaveBeenCalled();
    });
    it('emitted uploading event should trigger add file to node', () => {
      let addFileToNode = jest.fn();
      wrapper.setMethods({ addFileToNode });
      uploadItem.vm.$emit('uploading', { id: 'test' });
      expect(addFileToNode).toHaveBeenCalled();
      expect(addFileToNode.mock.calls[0][0].file.id).toBe('test');

      // Should auto-select this file
      expect(wrapper.vm.selected).toBe('test');
    });
  });
});
