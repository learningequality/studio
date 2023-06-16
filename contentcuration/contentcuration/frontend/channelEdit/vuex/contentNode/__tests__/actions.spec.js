import contentNode from '../index';
import currentChannel from '../../currentChannel/index';
import assessmentItem from '../../assessmentItem/index';
import file from 'shared/vuex/file';
import { ContentNode } from 'shared/data/resources';
import storeFactory from 'shared/vuex/baseStore';
import { mockChannelScope, resetMockChannelScope } from 'shared/utils/testing';

jest.mock('../../currentChannel/index');

const userId = 'testId';

const parentId = '000000000000000000000000000000000000';

describe('contentNode actions', () => {
  let store;
  let id;
  const contentNodeDatum = {
    title: 'test',
    parent: parentId,
    lft: 1,
    tags: {},
    total_count: 0,
    resource_count: 0,
    coach_count: 0,
  };
  beforeEach(async () => {
    await mockChannelScope('test-123');
    return ContentNode._add(contentNodeDatum).then(newId => {
      id = newId;
      contentNodeDatum.id = newId;
      jest
        .spyOn(ContentNode, 'fetchCollection')
        .mockImplementation(() => Promise.resolve([contentNodeDatum]));
      jest
        .spyOn(ContentNode, 'fetchModel')
        .mockImplementation(() => Promise.resolve(contentNodeDatum));
      return ContentNode._add({ title: 'notatest', parent: newId, lft: 2 }).then(() => {
        store = storeFactory({
          modules: {
            assessmentItem,
            contentNode,
            currentChannel,
            file,
          },
        });
        store.state.session.currentUser.id = userId;
      });
    });
  });
  afterEach(async () => {
    await resetMockChannelScope();
    jest.restoreAllMocks();
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
        expect(Object.values(store.state.contentNode.contentNodesMap)).toEqual([
          {
            ...contentNodeDatum,
            resource_count: 1,
            total_count: 1,
          },
        ]);
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
          tags: [],
          resource_count: 1,
          total_count: 1,
        });
      });
    });
  });
  describe('createContentNode action for a new contentNode', () => {
    it('should add a new contentNode with an id', () => {
      return store
        .dispatch('contentNode/createContentNode', { parent: id, kind: 'topic' })
        .then(newId => {
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
          learning_activities: { test: true },
        })
        .then(() => {
          expect(updateSpy).toHaveBeenCalledWith(id, {
            title: 'notatest',
            description: 'very',
            language: 'no',
            changed: true,
            complete: false,
            learning_activities: { test: true },
          });
          updateSpy.mockRestore();
        });
    });
  });
  describe('addTags action', () => {
    it('should call ContetnNode.update', () => {
      const updateSpy = jest.spyOn(ContentNode, 'update');
      store.commit('contentNode/ADD_CONTENTNODE', { id, tags: {} });
      return store
        .dispatch('contentNode/addTags', {
          ids: [id],
          tags: ['this'],
        })
        .then(() => {
          expect(updateSpy).toHaveBeenCalledWith(id, {
            'tags.this': true,
          });
          updateSpy.mockRestore();
        });
    });
  });
  describe('removeTags action', () => {
    it('should call ContetnNode.update', () => {
      const updateSpy = jest.spyOn(ContentNode, 'update');
      store.commit('contentNode/ADD_CONTENTNODE', { id, tags: { this: true } });
      return store
        .dispatch('contentNode/removeTags', {
          ids: [id],
          tags: ['this'],
        })
        .then(() => {
          expect(updateSpy).toHaveBeenCalledWith(id, {
            'tags.this': undefined,
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
});
