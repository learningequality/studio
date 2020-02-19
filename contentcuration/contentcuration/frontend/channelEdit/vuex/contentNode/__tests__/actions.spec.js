import contentNode from '../index';
import currentChannel from '../../currentChannel/index';
import file from '../../file/index';
import { ContentNode, Tree, File } from 'shared/data/resources';
import storeFactory from 'shared/vuex/baseStore';

jest.mock('../../currentChannel/index');

const userId = 'testId';

const parentId = '000000000000000000000000000000000000';

describe('contentNode actions', () => {
  let store;
  let id;
  const contentNodeDatum = { title: 'test', parent: parentId };
  beforeEach(() => {
    return ContentNode.put(contentNodeDatum).then(newId => {
      id = newId;
      return ContentNode.put({ title: 'notatest', parent: newId }).then(childId => {
        return Tree.table
          .bulkPut([
            { id: childId, parent: newId, sort_order: 2 },
            { id: newId, parent: null, sort_order: 1 },
          ])
          .then(() => {
            store = storeFactory({
              modules: {
                contentNode,
                currentChannel,
                file,
              },
            });
            store.state.session.currentUser.id = userId;
          });
      });
    });
  });
  afterEach(() => {
    return ContentNode.table.toCollection().delete();
  });
  describe('loadContentNodes action', () => {
    it('should call ContentNode.where', () => {
      const whereSpy = jest.spyOn(ContentNode, 'where');
      return store.dispatch('contentNode/loadContentNodes').then(() => {
        expect(whereSpy).toHaveBeenCalledWith({});
        whereSpy.mockRestore();
      });
    });
    it('should call ContentNode.where with a specific parent', () => {
      const whereSpy = jest.spyOn(ContentNode, 'where');
      return store.dispatch('contentNode/loadContentNodes', { parent: parentId }).then(() => {
        expect(whereSpy).toHaveBeenCalledWith({ parent: parentId });
        whereSpy.mockRestore();
      });
    });
    it('should set the returned data to the contentNodes', () => {
      return store.dispatch('contentNode/loadContentNodes', { parent: parentId }).then(() => {
        expect(Object.values(store.state.contentNode.contentNodesMap)).toEqual([contentNodeDatum]);
      });
    });
  });
  describe('loadContentNode action', () => {
    it('should call ContentNode.get', () => {
      const getSpy = jest.spyOn(ContentNode, 'get');
      return store.dispatch('contentNode/loadContentNode', id).then(() => {
        expect(getSpy).toHaveBeenCalledWith(id);
        getSpy.mockRestore();
      });
    });
    it('should set the returned data to the contentNodes', () => {
      return store.dispatch('contentNode/loadContentNode', id).then(() => {
        expect(store.getters['contentNode/getContentNode'](id)).toEqual({
          thumbnail_encoding: {},
          ...contentNodeDatum,
        });
      });
    });
  });
  describe('createContentNode action for a new contentNode', () => {
    it('should add a new contentNode with an id', () => {
      return store.dispatch('contentNode/createContentNode', { parent: id }).then(newId => {
        expect(store.getters['contentNode/getContentNode'](newId)).not.toBeUndefined();
      });
    });
  });
  describe('updateContentNode action for an existing contentNode', () => {
    it('should call ContentNode.update', () => {
      store.commit('contentNode/ADD_CONTENTNODE', {
        id,
        title: 'test',
      });
      const updateSpy = jest.spyOn(ContentNode, 'update');
      return store
        .dispatch('contentNode/updateContentNode', {
          id,
          title: 'notatest',
          description: 'very',
          language: 'no',
        })
        .then(() => {
          expect(updateSpy).toHaveBeenCalledWith(id, {
            title: 'notatest',
            description: 'very',
            language: 'no',
          });
          updateSpy.mockRestore();
        });
    });
  });
  describe('deleteContentNode action', () => {
    it('should call ContentNode.delete', () => {
      const deleteSpy = jest.spyOn(ContentNode, 'delete');
      store.commit('contentNode/ADD_CONTENTNODE', {
        id,
        title: 'test',
      });
      return store.dispatch('contentNode/deleteContentNode', id).then(() => {
        expect(deleteSpy).toHaveBeenCalledWith(id);
        deleteSpy.mockRestore();
      });
    });
    it('should remove the contentNode from vuex state', () => {
      store.commit('contentNode/ADD_CONTENTNODE', {
        id,
        title: 'test',
      });
      return store.dispatch('contentNode/deleteContentNode', id).then(() => {
        expect(store.getters['contentNode/getContentNode'](id)).toBeUndefined();
      });
    });
  });
  describe('addFiles action', () => {
    it('should call ContentNode.update', () => {
      const updateSpy = jest.spyOn(ContentNode, 'update');
      store.commit('contentNode/ADD_CONTENTNODE', {
        id,
        title: 'test',
        files: [],
      });
      return store.dispatch('contentNode/addFiles', { id, files: [] }).then(() => {
        expect(updateSpy).toHaveBeenCalledWith(id, { files: [] });
        updateSpy.mockRestore();
      });
    });
    it('should remove the files with matching presets', () => {
      let testFile = { id: 'testing', preset: { id: 'document', multi_language: false } };
      let replacementFile = { id: 'testfile', preset: { id: 'document', multi_language: false } };
      store.commit('file/ADD_FILES', [testFile, replacementFile]);
      store.commit('contentNode/ADD_CONTENTNODE', {
        id,
        title: 'test',
        files: [testFile.id],
      });
      const deleteSpy = jest.spyOn(File, 'delete');
      return store.dispatch('contentNode/addFiles', { id, files: [replacementFile] }).then(() => {
        expect(store.getters['contentNode/getContentNode'](id).files).toEqual([replacementFile.id]);
        expect(deleteSpy).toHaveBeenCalledWith(testFile.id);
        deleteSpy.mockRestore();
      });
    });
  });
  describe('removeFiles action', () => {
    it('should call File.delete and remove file', () => {
      const deleteSpy = jest.spyOn(File, 'delete');
      let testFile = { id: 'delete-me' };
      store.commit('contentNode/ADD_CONTENTNODE', {
        id,
        title: 'test',
        files: [testFile.id, 'other-file'],
      });
      return store.dispatch('contentNode/removeFiles', { id, files: [testFile] }).then(() => {
        expect(store.getters['contentNode/getContentNode'](id).files).toEqual(['other-file']);
        expect(deleteSpy).toHaveBeenCalledWith(testFile.id);
        deleteSpy.mockRestore();
      });
    });
  });
});
