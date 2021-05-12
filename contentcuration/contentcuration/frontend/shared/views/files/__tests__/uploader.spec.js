import { mount } from '@vue/test-utils';
import Uploader from '../Uploader';
import FileDropzone from '../FileDropzone';
import storeFactory from 'shared/vuex/baseStore';

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
      let uploadFile = jest.fn();
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
      let handleFiles = jest.fn();
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
      let handleFiles = jest.fn();
      wrapper.setMethods({ handleFiles });

      let data = { dataTransfer: { files: 'hello' } };
      wrapper.find('[data-test="dropzone"]').trigger('drop', data);
      expect(handleFiles).toHaveBeenCalledWith('hello');
    });
    describe('validateFiles', () => {
      it('should handle unsupported files', () => {
        let testFiles = [
          { name: 'file.wut', size: 10 },
          { name: 'file.mp4', size: 10 },
          { name: 'file.webm', size: 10 },
        ];
        let returned = wrapper.vm.validateFiles(testFiles);
        expect(returned).toHaveLength(2);
        expect(returned[0].name).toBe('file.mp4');
        expect(wrapper.vm.unsupportedFiles).toHaveLength(1);
        expect(wrapper.vm.unsupportedFiles[0].name).toBe('file.wut');
      });
      it('should handle files that are too large', () => {
        let testFiles = [
          { name: 'file.mp3', size: Number.MAX_SAFE_INTEGER },
          { name: 'file.mp4', size: 10 },
        ];
        let returned = wrapper.vm.validateFiles(testFiles);
        expect(returned).toHaveLength(1);
        expect(returned[0].name).toBe('file.mp4');
        expect(wrapper.vm.tooLargeFiles).toHaveLength(1);
        expect(wrapper.vm.tooLargeFiles[0].name).toBe('file.mp3');
      });
      it('should get the total upload size', () => {
        let testFiles = [
          { name: 'file.mp3', size: 100 },
          { name: 'file.mp4', size: 100 },
        ];
        let returned = wrapper.vm.validateFiles(testFiles);
        expect(returned).toHaveLength(2);
        expect(wrapper.vm.totalUploadSize).toBe(200);
      });
    });
    describe('handleFiles', () => {
      beforeEach(() => {
        wrapper = makeWrapper({ allowMultiple: true });
      });
      it('should show a prompt if there are unsupported files', () => {
        let testFiles = [{ name: 'file.wut', size: 10 }];
        wrapper.vm.handleFiles(testFiles);
        expect(wrapper.vm.showUnsupportedFilesAlert).toBe(true);
      });
      it('should show a prompt if files are too large', () => {
        let testFiles = [{ name: 'file.mp3', size: Number.MAX_SAFE_INTEGER }];
        wrapper.vm.handleFiles(testFiles);
        expect(wrapper.vm.showTooLargeFilesAlert).toBe(true);
      });
      it('should show a prompt if the total upload size exceeds the available space', () => {
        let testFiles = [{ name: 'file.mp3', size: 1000 }];
        wrapper.vm.handleFiles(testFiles);
        expect(wrapper.vm.showStorageExceededAlert).toBe(true);
      });
    });
  });
});
