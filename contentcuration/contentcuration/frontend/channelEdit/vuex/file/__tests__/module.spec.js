import file from '../index';
import storeFactory from 'shared/vuex/baseStore';
import { File } from 'shared/data/resources';
import client from 'shared/client';

jest.mock('shared/client');
jest.mock('shared/vuex/connectionPlugin');

const testFile = {
  id: 'testfile',
  original_filename: 'document.pdf',
  url: 'path/to/document.pdf',
  file_size: 100,
  preset: 'document',
};

const userId = 'some user';

describe('file store', () => {
  let store;
  let id;
  beforeEach(() => {
    return File.put(testFile).then(newId => {
      id = newId;
      store = storeFactory({
        modules: { file },
      });
      store.commit('file/ADD_FILE', testFile);
      store.state.session.currentUser.id = userId;
    });
  });
  afterEach(() => {
    return File.table.toCollection().delete();
  });
  describe('file getters', () => {
    it('getFile', () => {
      let file = store.getters['file/getFile']('testfile');
      expect(file.id).toEqual('testfile');
      expect(file.preset.id).toBe('document');
    });
    it('getTotalSize', () => {
      let file = {
        id: 'test',
        preset: 'document_thumbnail',
        file_size: 100,
      };
      let file2 = {
        id: 'test2',
        preset: 'epub',
        file_size: 100,
      };
      store.commit('file/ADD_FILES', [file, file2]);
      expect(store.getters['file/getTotalSize'](['test', 'test2'])).toBe(200);
    });
  });
  describe('file actions', () => {
    describe('loadFile action', () => {
      it('should call File.get', () => {
        const getSpy = jest.spyOn(File, 'get');
        return store.dispatch('file/loadFile', id).then(() => {
          expect(getSpy).toHaveBeenCalledWith(id);
          getSpy.mockRestore();
        });
      });
      it('should set the returned data to the file state data', () => {
        return store.dispatch('file/loadFile', id).then(() => {
          expect(store.getters['file/getFile'](id).id).toBe(testFile.id);
        });
      });
    });
    describe('loadFiles action', () => {
      it('should call File.where', () => {
        const whereSpy = jest.spyOn(File, 'where');
        return store.dispatch('file/loadFiles').then(() => {
          expect(whereSpy).toHaveBeenCalledWith({});
          whereSpy.mockRestore();
        });
      });
    });
    describe('createFile action', () => {
      it('should add a new file with an id and other fields set', () => {
        let payload = {
          file: { name: 'abc.pdf', size: 100 },
        };
        return store.dispatch('file/createFile', payload).then(newId => {
          let file = store.getters['file/getFile'](newId);
          expect(file).not.toBeUndefined();
          expect(file.preset.id).toBe('document');
          expect(file.file_size).toBe(100);
          expect(file.uploaded_by).toBe(userId);
          expect(file.original_filename).toBe('abc.pdf');
        });
      });
      it('should set the preset if presetId is provided', () => {
        let payload = {
          file: { name: 'abc.pdf', size: 100 },
          presetId: 'epub',
        };
        return store.dispatch('file/createFile', payload).then(newId => {
          let file = store.getters['file/getFile'](newId);
          expect(file).not.toBeUndefined();
          expect(file.preset.id).toBe('epub');
        });
      });
    });
    describe('updateFile action for an existing file', () => {
      it('should call File.update', () => {
        store.commit('file/ADD_FILE', {
          id,
          title: 'test',
        });
        const updateSpy = jest.spyOn(File, 'update');
        return store
          .dispatch('file/updateFile', {
            id,
            error: 'nope',
          })
          .then(() => {
            expect(updateSpy).toHaveBeenCalledWith(id, { error: 'nope' });
            updateSpy.mockRestore();
          });
      });
    });
    describe('upload actions', () => {
      it('getUploadURL should call client.get get_upload_url', () => {
        return store.dispatch('file/getUploadURL').then(() => {
          expect(client.get.mock.calls[0][0]).toBe('get_upload_url');
          client.get.mockRestore();
        });
      });
      it('uploadFileToStorage should call client.post with upload url', () => {
        let payload = { id: 'file-id', file: { id: 'hello' }, url: 'test_url' };
        return store.dispatch('file/uploadFileToStorage', payload).then(() => {
          expect(client.post.mock.calls[0][0]).toBe(payload.url);
          client.post.mockRestore();
        });
      });
    });
  });
});
