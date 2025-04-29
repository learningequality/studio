import { mount } from '@vue/test-utils';
import Uploader from '../Uploader';
import FileDropzone from '../FileDropzone';
import { validateFile } from '../../../vuex/file/validation';
import storeFactory from 'shared/vuex/baseStore';

jest.mock('../../../vuex/file/validation', () => ({
  validateFile: jest.fn(() => Promise.resolve(0)),
}));

function makeWrapper(propsData = {}) {
  const handleFiles = jest.spyOn(Uploader.methods, 'handleFiles');
  const uploadFile = jest.spyOn(Uploader.methods, 'uploadFile');

  const wrapper = mount(Uploader, {
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

  return [wrapper, { handleFiles, uploadFile }];
}

describe('uploader', () => {
  let wrapper, mocks;

  afterEach(() => {
    wrapper && wrapper.destroy();
    mocks && mocks.handleFiles.mockRestore();
    mocks && mocks.uploadFile.mockRestore();
  });

  describe('props', () => {
    it('readonly should disable open file dialog', () => {
      [wrapper, mocks] = makeWrapper({ readonly: true });
      wrapper.vm.openFileDialog();
      expect(wrapper.findComponent('[data-test="upload-dialog"]').exists()).toBe(false);
    });

    it('readonly should disable dropping files', async () => {
      [wrapper, mocks] = makeWrapper({ readonly: true });
      mocks.uploadFile.mockImplementation(() => Promise.resolve());
      await wrapper.vm.handleFiles([{ name: 'test.png' }]);
      expect(mocks.uploadFile).not.toHaveBeenCalled();
    });

    it('readonly should not highlight dropzone', async () => {
      [wrapper, mocks] = makeWrapper({ readonly: true });
      await wrapper.setData({ highlight: true });
      expect(wrapper.findComponent(FileDropzone).vm.highlightDropzone).toBe(false);
    });

    it('allowDrop should determine whether drag/drop is allowed', async () => {
      [wrapper, mocks] = makeWrapper({ allowDrop: true });
      mocks.handleFiles.mockImplementation(() => Promise.resolve());
      wrapper.findComponent(FileDropzone).vm.drop({ dataTransfer: {} });
      await wrapper.vm.$nextTick();
      expect(mocks.handleFiles).toHaveBeenCalled();
    });
  });

  describe('computed', () => {
    it('presetID should set the allowed format', () => {
      [wrapper, mocks] = makeWrapper({ presetID: 'video_subtitle' });
      expect(wrapper.vm.acceptedFiles[0].id).toBe('video_subtitle');
      expect(wrapper.vm.acceptedFiles).toHaveLength(1);
    });
    it('no presetID should allow any primary formats', () => {
      [wrapper, mocks] = makeWrapper();
      expect(wrapper.vm.acceptedFiles.filter(f => f.id === 'document')).toHaveLength(1);
    });
  });

  describe('methods', () => {
    beforeEach(() => {
      [wrapper, mocks] = makeWrapper();
    });

    it('drop should call handle files', async () => {
      mocks.handleFiles.mockImplementation(() => Promise.resolve());
      const data = { dataTransfer: { files: 'hello' } };
      wrapper.find('[data-test="dropzone"]').trigger('drop', data);
      expect(mocks.handleFiles).toHaveBeenCalledWith('hello');
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
        [wrapper, mocks] = makeWrapper({ allowMultiple: true });
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
