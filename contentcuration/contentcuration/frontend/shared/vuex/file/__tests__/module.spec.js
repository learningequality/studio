import storeFactory from 'shared/vuex/baseStore';
import { File } from 'shared/data/resources';
import client from 'shared/client';

jest.mock('shared/vuex/connectionPlugin');

const contentnode = 'testnode';
window.storageBaseUrl = 'www.test.com/';

const testFile = {
  original_filename: 'document.pdf',
  url: 'path/to/document.pdf',
  checksum: 'checksum',
  file_size: 100,
  preset: 'document',
  contentnode,
};

const userId = 'some user';

describe('file store', () => {
  let store;
  let id;
  beforeEach(() => {
    jest.spyOn(File, 'fetchCollection').mockImplementation(() => Promise.resolve([testFile]));
    jest.spyOn(File, 'fetchModel').mockImplementation(() => Promise.resolve(testFile));
    return File.put(testFile).then(newId => {
      id = newId;
      store = storeFactory();
      store.commit('file/ADD_FILE', { id, ...testFile });
      store.state.session.currentUser.id = userId;
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    return File.table.toCollection().delete();
  });
  describe('file getters', () => {
    it('getContentNodeFileById', () => {
      const file = store.getters['file/getContentNodeFileById'](contentnode, id);
      expect(file.id).toEqual(id);
      expect(file.preset.id).toBe('document');
    });
    it('contentNodesTotalSize', () => {
      const file = {
        id: 'test',
        preset: 'document_thumbnail',
        file_size: 100,
        checksum: 'checksum-1',
        contentnode,
      };
      const file2 = {
        id: 'test2',
        preset: 'epub',
        file_size: 100,
        checksum: 'checksum-2',
        contentnode,
      };
      store.commit('file/REMOVE_FILE', { id, ...testFile });
      store.commit('file/ADD_FILES', [file, file2]);
      expect(store.getters['file/contentNodesTotalSize']([contentnode])).toBe(200);
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
          expect(store.getters['file/getContentNodeFiles'](contentnode)[0].id).toEqual(id);
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
      it('uploadFileToStorage should call client.put with upload url', () => {
        const payload = {
          id: 'file-id',
          file: { id: 'hello' },
          url: 'test_url',
          checksum: '00000000000000000000000000000000',
        };
        return store.dispatch('file/uploadFileToStorage', payload).then(() => {
          expect(client.put.mock.calls[0][0]).toBe(payload.url);
          client.post.mockRestore();
        });
      });
    });
  });
});
