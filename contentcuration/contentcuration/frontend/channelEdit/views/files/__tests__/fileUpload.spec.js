import { mount } from '@vue/test-utils';
import FileUpload from '../FileUpload';
import FileUploadItem from '../FileUploadItem';
import store from '../../../store';

const testFiles = [
  {
    id: 'file-1',
    preset: {
      id: 'document',
      supplementary: false,
      order: 2,
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
      supplementary: false,
      order: 1,
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
      nodeId: 'testnode',
      viewOnly: false,
    },
    computed: {
      node() {
        return { kind: 'document', title: 'test' };
      },
      files() {
        return files;
      },
    },
    methods: {
      createFile() {
        return Promise.resolve();
      },
    },
    stubs: {
      FilePreview: true,
    },
  });
}

describe('fileUpload', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper(testFiles);
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
    it('should allow file removal if there are multiple valid primary files', () => {
      expect(wrapper.vm.allowFileRemove).toBe(true);
    });
    it('should disallow file removal if viewOnly is true', () => {
      wrapper.setProps({ viewOnly: true });
      expect(wrapper.vm.allowFileRemove).toBe(false);
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
    it('emitted remove event should trigger delete file', () => {
      let deleteFile = jest.fn();
      wrapper.setData({ selected: 'file-1' });
      wrapper.setMethods({ deleteFile });
      uploadItem.vm.$emit('remove', testFiles[0]);
      expect(deleteFile).toHaveBeenCalled();
      expect(deleteFile.mock.calls[0][0]).toBe(testFiles[0]);
    });
    it('emitted uploading event should trigger create file', () => {
      let createFile = jest.fn(() => Promise.resolve());
      wrapper.setMethods({ createFile });
      uploadItem.vm.$emit('uploading', testFiles[1]);
      expect(createFile).toHaveBeenCalled();
      expect(createFile.mock.calls[0][0]).toEqual({
        ...testFiles[1],
        contentnode: 'testnode',
      });
    });
  });
});
