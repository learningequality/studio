import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import fileUploadsModule from 'edit_channel/vuexModules/fileUpload';
import client from 'shared/client';

jest.mock('shared/client');

Vue.use(Vuex);

describe('fileUploadStore', () => {
  let store;
  beforeEach(() => {
    client.mockReset();
    store = new Store({
      modules: {
        fileUploads: fileUploadsModule,
      },
    });
  });
  describe('mutations', () => {
    beforeEach(() => {
      let testFile = { id: 'test', file: { name: 'video.mp4' } };
      store.commit('fileUploads/ADD_FILE', testFile);
    });
    it('ADD_FILE should add a file with all of the metadata', () => {
      expect(store.state.fileUploads.files['test'].id).toBe('test');
      expect(store.state.fileUploads.files['test'].progress).toBe(0);
      expect(store.state.fileUploads.files['test'].name).toBe('video');
      expect(store.state.fileUploads.files['test'].preset.id).toBe('high_res_video');
      expect(store.state.fileUploads.files['test'].preset.kind_id).toBe('video');
      expect(store.state.fileUploads.files['test'].file_format).toBe('mp4');
    });
    it('REMOVE_FILE should remove the file from the store', () => {
      store.commit('fileUploads/REMOVE_FILE', 'test');
      expect(store.state.fileUploads.files['test']).toBeFalsy();
    });
    it('SET_FILE_UPLOAD_PROGRESS should update the file progress', () => {
      store.commit('fileUploads/SET_FILE_UPLOAD_PROGRESS', { id: 'test', progress: 25 });
      expect(store.state.fileUploads.files['test'].progress).toBe(25);
    });
    it('SET_FILE_CHECKSUM should update the file checksum', () => {
      store.commit('fileUploads/SET_FILE_CHECKSUM', { id: 'test', checksum: 'abc' });
      expect(store.state.fileUploads.files['test'].checksum).toBe('abc');
    });
    it('SET_FILE_PATH should update the file path', () => {
      store.commit('fileUploads/SET_FILE_PATH', { id: 'test', path: 'filepath' });
      expect(store.state.fileUploads.files['test'].file_on_disk).toBe('filepath');
    });
    it('SET_FILE_ERROR should set the file error', () => {
      let error = {
        id: 'test',
        error: 'YIKES',
        message: 'oops',
      };
      store.commit('fileUploads/SET_FILE_ERROR', error);
      expect(store.state.fileUploads.files['test'].error.type).toBe('YIKES');
      expect(store.state.fileUploads.files['test'].error.message).toBe('oops');
    });
  });

  describe('actions', () => {
    it('getUploadURL should call get_upload_url endpoint', () => {
      return store.dispatch('fileUploads/getUploadURL').then(() => {
        expect(client.get).toHaveBeenCalled();
        expect(client.get.mock.calls[0][0]).toBe('get_upload_url');
      });
    });
    it('uploadFileToStorage should call file endpoint with file data', () => {
      let testFile = { file: { id: 'test-file' }, url: 'test_url' };
      return store.dispatch('fileUploads/uploadFileToStorage', testFile).then(() => {
        expect(client.post).toHaveBeenCalled();
        expect(client.post.mock.calls[0][0]).toBe('test_url');
      });
    });
  });
});
