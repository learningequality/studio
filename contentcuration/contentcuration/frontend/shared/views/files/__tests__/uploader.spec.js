import { mount } from '@vue/test-utils';
import Uploader from '../Uploader';
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
  describe('props', () => {
    it('readonly should disable open file dialog', () => {
      let wrapper = makeWrapper({ readonly: true });
      wrapper.vm.openFileDialog();
      expect(wrapper.find('[data-test="upload-dialog"]').exists()).toBe(false);
    });
    it('readonly should disable dropping files', () => {
      let uploadFile = jest.fn();
      let wrapper = makeWrapper({ readonly: true });
      wrapper.setMethods({ uploadFile });
      wrapper.vm.handleFiles([{ name: 'test.png' }]);
      expect(uploadFile).not.toHaveBeenCalled();
    });
    it('readonly should not highlight dropzone', () => {
      let wrapper = makeWrapper({ readonly: true });
      wrapper.setData({ highlight: true });
      expect(wrapper.vm.highlightDropzone).toBe(false);
    });
    it('allowDrop should determine whether drag/drop is allowed', () => {
      let handleFiles = jest.fn();
      let wrapper = makeWrapper({ allowDrop: true });
      wrapper.setMethods({ handleFiles });
      wrapper.vm.drop({ dataTransfer: {} });
      expect(handleFiles).toHaveBeenCalled();
    });
  });
  describe('computed', () => {
    it('presetID should set the allowed format', () => {
      let wrapper = makeWrapper({ presetID: 'video_subtitle' });
      expect(wrapper.vm.acceptedFiles[0].id).toBe('video_subtitle');
      expect(wrapper.vm.acceptedFiles).toHaveLength(1);
    });
    it('no presetID should allow any primary formats', () => {
      let wrapper = makeWrapper();
      expect(wrapper.vm.acceptedFiles.filter(f => f.id === 'document')).toHaveLength(1);
    });
  });
  describe('methods', () => {
    let wrapper;
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
    it('setError should set the file error in the vuex store', () => {
      let updateFile = jest.fn();
      wrapper.setMethods({ updateFile });

      wrapper.vm.setError('test', 'UPLOAD_FAILED');
      expect(updateFile).toHaveBeenCalled();
      expect(updateFile.mock.calls[0][0].id).toBe('test');
      expect(updateFile.mock.calls[0][0].error.type).toBe('UPLOAD_FAILED');
    });
    describe('validateFiles', () => {
      it('should handle unsupported files', () => {
        let testFiles = [
          { name: 'file.wut', size: 10 },
          { name: 'file.mp4', size: 10 },
        ];
        let returned = wrapper.vm.validateFiles(testFiles);
        expect(returned).toHaveLength(1);
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
        expect(wrapper.find({ ref: 'unsupportedfiles' }).find({ ref: 'alert' }).vm.dialog).toBe(
          true
        );
      });
      it('should show a prompt if files are too large', () => {
        let testFiles = [{ name: 'file.mp3', size: Number.MAX_SAFE_INTEGER }];
        wrapper.vm.handleFiles(testFiles);
        expect(wrapper.find({ ref: 'toolargefiles' }).find({ ref: 'alert' }).vm.dialog).toBe(true);
      });
      it('should show a prompt if the total upload size exceeds the available space', () => {
        let testFiles = [{ name: 'file.mp3', size: 1000 }];
        wrapper.vm.handleFiles(testFiles);
        expect(wrapper.find({ ref: 'storageexceeded' }).find({ ref: 'alert' }).vm.dialog).toBe(
          true
        );
      });
      it('should call createFile with the valid files and emit an uploading event', () => {
        let createFile = jest.fn();
        wrapper.setMethods({ createFile });

        let testFiles = [
          { id: 'invalid file', name: 'file.wut', size: 10 },
          { id: 'valid file', name: 'file.mp4', size: 10 },
        ];
        wrapper.vm.handleFiles(testFiles);
        expect(createFile).toHaveBeenCalled();
      });
    });
  });
});
