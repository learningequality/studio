import storeFactory from 'shared/vuex/baseStore';
import { File } from 'shared/data/resources';
import client from 'shared/client';

jest.mock('shared/client');
jest.mock('shared/vuex/connectionPlugin');

const contentnode = 'testnode';

const testFile = {
  original_filename: 'document.pdf',
  url: 'path/to/document.pdf',
  file_size: 100,
  preset: 'document',
  contentnode,
};

const userId = 'some user';

describe('file store', () => {
  let store;
  let id;
  beforeEach(() => {
    return File.put(testFile).then(newId => {
      id = newId;
      store = storeFactory();
      store.commit('file/ADD_FILE', { id, ...testFile });
      store.state.session.currentUser.id = userId;
    });
  });
  afterEach(() => {
    return File.table.toCollection().delete();
  });
  describe('file getters', () => {
    it('getContentNodeFileById', () => {
      const file = store.getters['file/getContentNodeFileById'](contentnode, id);
      expect(file.id).toEqual(id);
      expect(file.preset.id).toBe('document');
    });
    it('contentNodesTotalSize', () => {
      let file = {
        id: 'test',
        preset: 'document_thumbnail',
        file_size: 100,
        contentnode,
      };
      let file2 = {
        id: 'test2',
        preset: 'epub',
        file_size: 100,
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
    describe('createFile action', () => {
      it('should add a new file with an id and other fields set', () => {
        const payload = {
          original_filename: 'abc.pdf',
          file_size: 100,
          contentnode,
          file_format: 'pdf',
        };
        return store.dispatch('file/createFile', payload).then(newId => {
          const file = store.getters['file/getContentNodeFileById'](contentnode, newId);
          expect(file).not.toBeUndefined();
          expect(file.preset.id).toBe('document');
          expect(file.file_size).toBe(100);
          expect(file.uploaded_by).toBe(userId);
          expect(file.original_filename).toBe('abc.pdf');
        });
      });
      it('should set the preset if presetId is provided', () => {
        const payload = { name: 'abc.pdf', size: 100, preset: 'epub', contentnode };
        return store.dispatch('file/createFile', payload).then(newId => {
          const file = store.getters['file/getContentNodeFileById'](contentnode, newId);
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
