import { mount } from '@vue/test-utils';
import Uploader from '../Uploader';
import FileDropzone from '../FileDropzone';
import { validateFile } from '../../../vuex/file/validation';
import storeFactory from 'shared/vuex/baseStore';

jest.mock('../../../vuex/file/validation', () => ({
  validateFile: jest.fn(() => Promise.resolve(0)),
}));

function makeWrapper(propsData = {}) {
  return mount(Uploader, {
    store: storeFactory(),
    propsData,
    computed: {
      availableSpace() {
        return 100;
      },
      maxFileSize() {
        return 100;
      },
    },
  });
}

describe('uploader', () => {
  let wrapper;
  afterEach(() => {
    wrapper && wrapper.destroy();
  });

  describe('props', () => {
    it('readonly should disable open file dialog', () => {
      wrapper = makeWrapper({ readonly: true });
      wrapper.vm.openFileDialog();
      expect(wrapper.find('[data-test="upload-dialog"]').exists()).toBe(false);
    });
    it('readonly should disable dropping files', () => {
      const uploadFile = jest.fn();
      wrapper = makeWrapper({ readonly: true });
      wrapper.setMethods({ uploadFile });
      wrapper.vm.handleFiles([{ name: 'test.png' }]);
      expect(uploadFile).not.toHaveBeenCalled();
    });
    it('readonly should not highlight dropzone', () => {
      wrapper = makeWrapper({ readonly: true });
      wrapper.setData({ highlight: true });
      expect(wrapper.find(FileDropzone).vm.highlightDropzone).toBe(false);
    });
    it('allowDrop should determine whether drag/drop is allowed', () => {
      const handleFiles = jest.fn();
      wrapper = makeWrapper({ allowDrop: true });
      wrapper.setMethods({ handleFiles });
      wrapper.find(FileDropzone).vm.drop({ dataTransfer: {} });
      expect(handleFiles).toHaveBeenCalled();
    });
  });
  describe('computed', () => {
    it('presetID should set the allowed format', () => {
      wrapper = makeWrapper({ presetID: 'video_subtitle' });
      expect(wrapper.vm.acceptedFiles[0].id).toBe('video_subtitle');
      expect(wrapper.vm.acceptedFiles).toHaveLength(1);
    });
    it('no presetID should allow any primary formats', () => {
      wrapper = makeWrapper();
      expect(wrapper.vm.acceptedFiles.filter(f => f.id === 'document')).toHaveLength(1);
    });
  });
  describe('methods', () => {
    beforeEach(() => {
      wrapper = makeWrapper();
    });
    it('drop should call handle files', () => {
      const handleFiles = jest.fn();
      wrapper.setMethods({ handleFiles });

      const data = { dataTransfer: { files: 'hello' } };
      wrapper.find('[data-test="dropzone"]').trigger('drop', data);
      expect(handleFiles).toHaveBeenCalledWith('hello');
    });
    describe('validateFiles', () => {
      it('should handle unsupported files', async () => {
        const testFiles = [
          { name: 'file.wut', size: 10 },
          { name: 'file.mp4', size: 10 },
          { name: 'file.webm', size: 10 },
        ];
        const returned = await wrapper.vm.validateFiles(testFiles);
        expect(returned).toHaveLength(2);
        expect(returned[0].name).toBe('file.mp4');
        expect(wrapper.vm.unsupportedFiles).toHaveLength(1);
        expect(wrapper.vm.unsupportedFiles[0].name).toBe('file.wut');
      });
      it('should handle files that are too large', async () => {
        const testFiles = [
          { name: 'file.mp3', size: Number.MAX_SAFE_INTEGER },
          { name: 'file.mp4', size: 10 },
        ];
        const returned = await wrapper.vm.validateFiles(testFiles);
        expect(returned).toHaveLength(1);
        expect(returned[0].name).toBe('file.mp4');
        expect(wrapper.vm.tooLargeFiles).toHaveLength(1);
        expect(wrapper.vm.tooLargeFiles[0].name).toBe('file.mp3');
      });
      it('should get the total upload size', async () => {
        const testFiles = [
          { name: 'file.mp3', size: 100 },
          { name: 'file.mp4', size: 100 },
        ];
        const returned = await wrapper.vm.validateFiles(testFiles);
        expect(returned).toHaveLength(2);
        expect(wrapper.vm.totalUploadSize).toBe(200);
      });
      it('should mark files as unsupported if validation fails', async () => {
        validateFile.mockImplementationOnce(() => Promise.resolve(1));

        const testFiles = [
          { name: 'file.mp4', size: 10 }, // Valid extension but validation fails
        ];

        const returned = await wrapper.vm.validateFiles(testFiles);
        expect(returned).toHaveLength(0); // No valid files returned
        expect(wrapper.vm.unsupportedFiles).toHaveLength(1);
        expect(wrapper.vm.unsupportedFiles[0].name).toBe('file.mp4');
      });
    });
    describe('handleFiles', () => {
      beforeEach(() => {
        wrapper = makeWrapper({ allowMultiple: true });
      });
      it('should show a prompt if there are unsupported files', async () => {
        const testFiles = [{ name: 'file.wut', size: 10 }];
        await wrapper.vm.handleFiles(testFiles);
        expect(wrapper.vm.showUnsupportedFilesAlert).toBe(true);
      });
      it('should show a prompt if files are too large', async () => {
        const testFiles = [{ name: 'file.mp3', size: Number.MAX_SAFE_INTEGER }];
        await wrapper.vm.handleFiles(testFiles);
        expect(wrapper.vm.showTooLargeFilesAlert).toBe(true);
      });
      it('should show a prompt if the total upload size exceeds the available space', async () => {
        const testFiles = [{ name: 'file.mp3', size: 1000 }];
        await wrapper.vm.handleFiles(testFiles);
        expect(wrapper.vm.showStorageExceededAlert).toBe(true);
      });
    });
  });
});
