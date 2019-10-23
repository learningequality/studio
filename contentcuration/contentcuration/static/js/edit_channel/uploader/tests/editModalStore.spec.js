import _ from 'underscore';
import { modes } from '../constants';
import store from './../vuex/store';
import {
  DEFAULT_TOPIC,
  DEFAULT_TOPIC2,
  DEFAULT_VIDEO,
  DEFAULT_EXERCISE,
  DEFAULT_EXERCISE2,
} from './data';
import State from 'edit_channel/state';

/*
  TODO: there are some issues trying to mock jquery.ajax as it
  throws a `TypeError: Cannot read property 'prototype' of undefined`
  due to how it interacts with Backbone. Added TODOs where we'll need
  to test
*/

State.current_channel = {
  id: 'test-channel',
};
State.currentNode = {
  id: 'test-root',
  metadata: {
    max_sort_order: 0,
  },
};
State.preferences = {};

const testNodes = [
  DEFAULT_TOPIC,
  DEFAULT_TOPIC2,
  DEFAULT_VIDEO,
  DEFAULT_EXERCISE,
  DEFAULT_EXERCISE2,
];

describe('editModalStore', () => {
  let topic1Index = _.findIndex(testNodes, { id: DEFAULT_TOPIC.id });
  let topic2Index = _.findIndex(testNodes, { id: DEFAULT_TOPIC2.id });
  let videoIndex = _.findIndex(testNodes, { id: DEFAULT_VIDEO.id });
  let exerciseIndex = _.findIndex(testNodes, { id: DEFAULT_EXERCISE.id });
  let exercise2Index = _.findIndex(testNodes, { id: DEFAULT_EXERCISE2.id });
  beforeEach(() => {
    store.commit('edit_modal/RESET_STATE');
    store.commit('edit_modal/SET_NODES', testNodes);
    store.commit('edit_modal/SET_MODE', modes.EDIT);
  });
  describe('getters', () => {
    it('getNode should return a node at a given index', () => {
      _.each(testNodes, (n, i) => {
        expect(store.getters['edit_modal/getNode'](i).id).toEqual(n.id);
      });
    });
    it('selected should return a list of all selected node objects', () => {
      store.commit('edit_modal/SELECT_NODE', topic1Index);
      expect(store.getters['edit_modal/selected']).toHaveLength(1);
      expect(store.getters['edit_modal/selected']).toContain(DEFAULT_TOPIC);
      expect(store.getters['edit_modal/selected']).not.toContain(DEFAULT_TOPIC2);
      expect(store.getters['edit_modal/selected']).not.toContain(DEFAULT_VIDEO);
      expect(store.getters['edit_modal/selected']).not.toContain(DEFAULT_EXERCISE);
    });
    it('allExercises should return whether all selected nodes are exercises', () => {
      store.commit('edit_modal/SELECT_NODE', exerciseIndex);
      expect(store.getters['edit_modal/allExercises']).toBe(true);
      store.commit('edit_modal/SELECT_NODE', topic2Index);
      expect(store.getters['edit_modal/allExercises']).toBe(false);
    });
    it('allResources should return whether all selected nodes are not topics', () => {
      store.commit('edit_modal/SELECT_NODE', videoIndex);
      expect(store.getters['edit_modal/allResources']).toBe(true);
      store.commit('edit_modal/SELECT_NODE', topic2Index);
      expect(store.getters['edit_modal/allResources']).toBe(false);
    });
    it('changed should return whether any of the nodes have been changed', () => {
      store.commit('edit_modal/SET_NODE', _.findIndex(testNodes, { id: DEFAULT_TOPIC.id }));
      expect(store.getters['edit_modal/changed']).toBe(false);
      store.commit('edit_modal/UPDATE_NODE', { title: 'New Title' });
      expect(store.getters['edit_modal/changed']).toBe(true);
    });
  });

  describe('mutations', () => {
    it('RESET_STATE should revert state back to original fields', () => {
      expect(store.state.edit_modal.nodes).toHaveLength(testNodes.length);
      store.commit('edit_modal/RESET_STATE');
      expect(store.state.edit_modal.nodes).toHaveLength(0);
    });
    it('SET_MODE should set state.mode', () => {
      store.commit('edit_modal/SET_MODE', modes.NEW_TOPIC);
      expect(store.state.edit_modal.mode).toEqual(modes.NEW_TOPIC);
    });
    it('SET_CHANGES should aggregate shared data into one object', () => {
      store.commit('edit_modal/SELECT_NODE', videoIndex);
      store.commit('edit_modal/UPDATE_NODE', { license_description: 'License Description' });
      store.commit('edit_modal/SELECT_NODE', exerciseIndex);
      store.commit('edit_modal/UPDATE_NODE', { copyright_holder: 'Copyright Holder' });
      store.commit('edit_modal/SET_CHANGES');
      expect(store.state.edit_modal.changes.copyright_holder.value).toEqual('Copyright Holder');
      expect(store.state.edit_modal.changes.title.value).toBeFalsy();
      expect(store.state.edit_modal.changes.license_description.varied).toBe(true);
      expect(store.state.edit_modal.changes.license_description.value).toBeFalsy();
    });

    describe('node selection', () => {
      it('SET_NODES should set the nodes that are listed in the edit modal', () => {
        store.commit('edit_modal/SET_NODES', [DEFAULT_VIDEO, DEFAULT_EXERCISE]);
        expect(store.state.edit_modal.nodes).toHaveLength(2);
        expect(store.state.edit_modal.nodes).toContain(DEFAULT_VIDEO);
        expect(store.state.edit_modal.nodes).toContain(DEFAULT_EXERCISE);
        expect(store.state.edit_modal.nodes).not.toContain(DEFAULT_TOPIC);
        expect(store.state.edit_modal.nodes).not.toContain(DEFAULT_TOPIC2);
      });
      it('SET_LOADED_NODES should set all fields on nodes that were loaded and mark _COMPLETE as true', () => {
        expect(DEFAULT_VIDEO['_COMPLETE']).toBe(false);
        expect(DEFAULT_EXERCISE['_COMPLETE']).toBe(false);
        store.commit('edit_modal/SET_LOADED_NODES', [DEFAULT_VIDEO, DEFAULT_EXERCISE]);
        expect(DEFAULT_VIDEO['_COMPLETE']).toBe(true);
        expect(DEFAULT_EXERCISE['_COMPLETE']).toBe(true);
        expect(DEFAULT_TOPIC['_COMPLETE']).toBe(false);
        expect(DEFAULT_TOPIC2['_COMPLETE']).toBe(false);
      });
      it('RESET_SELECTED should deselect all nodes', () => {
        store.commit('edit_modal/SELECT_ALL_NODES');
        expect(store.state.edit_modal.selectedIndices).toHaveLength(testNodes.length);
        store.commit('edit_modal/RESET_SELECTED');
        expect(store.state.edit_modal.selectedIndices).toHaveLength(0);
      });
      it('SET_SELECTED should set the selected nodes', () => {
        let videoIndex = _.findIndex(testNodes, { id: DEFAULT_VIDEO.id });
        store.commit('edit_modal/SET_SELECTED', [videoIndex]);
        expect(store.state.edit_modal.selectedIndices).toHaveLength(1);
        expect(store.state.edit_modal.selectedIndices).toContain(videoIndex);
      });
      it('SET_NODE should set the selected nodes to the node at the given index', () => {
        let videoIndex = _.findIndex(testNodes, { id: DEFAULT_VIDEO.id });
        let exerciseIndex = _.findIndex(testNodes, { id: DEFAULT_EXERCISE.id });
        store.commit('edit_modal/SET_NODE', videoIndex);
        expect(store.state.edit_modal.selectedIndices).toHaveLength(1);
        expect(store.state.edit_modal.selectedIndices).toContain(videoIndex);
        expect(store.state.edit_modal.selectedIndices).not.toContain(exerciseIndex);
        store.commit('edit_modal/SET_NODE', exerciseIndex);
        expect(store.state.edit_modal.selectedIndices).toHaveLength(1);
        expect(store.state.edit_modal.selectedIndices).not.toContain(videoIndex);
        expect(store.state.edit_modal.selectedIndices).toContain(exerciseIndex);
      });
      it('SELECT_NODE should add node to selected nodes', () => {
        store.commit('edit_modal/SELECT_NODE', videoIndex);
        expect(store.state.edit_modal.selectedIndices).toHaveLength(1);
        expect(store.state.edit_modal.selectedIndices).toContain(videoIndex);
        expect(store.state.edit_modal.selectedIndices).not.toContain(exerciseIndex);
        store.commit('edit_modal/SELECT_NODE', exerciseIndex);
        expect(store.state.edit_modal.selectedIndices).toHaveLength(2);
        expect(store.state.edit_modal.selectedIndices).toContain(videoIndex);
        expect(store.state.edit_modal.selectedIndices).toContain(exerciseIndex);
      });
      it('DESELECT_NODE should remove node from selected nodes', () => {
        store.commit('edit_modal/SELECT_NODE', videoIndex);
        expect(store.state.edit_modal.selectedIndices).toHaveLength(1);
        expect(store.state.edit_modal.selectedIndices).toContain(videoIndex);
        store.commit('edit_modal/DESELECT_NODE', videoIndex);
        expect(store.state.edit_modal.selectedIndices).toHaveLength(0);
        expect(store.state.edit_modal.selectedIndices).not.toContain(videoIndex);
      });
      it('SELECT_ALL_NODES should select all nodes', () => {
        store.commit('edit_modal/RESET_SELECTED');
        expect(store.state.edit_modal.selectedIndices).toHaveLength(0);
        store.commit('edit_modal/SELECT_ALL_NODES');
        expect(store.state.edit_modal.selectedIndices).toHaveLength(testNodes.length);
      });
    });
    describe('field changes', () => {
      it('UPDATE_NODE should set the fields of selected nodes based on payload', () => {
        // Single node selected
        store.commit('edit_modal/SET_NODE', videoIndex);
        store.commit('edit_modal/UPDATE_NODE', { title: 'New Title' });
        expect(DEFAULT_VIDEO.title).toEqual('New Title');
        expect(DEFAULT_EXERCISE.title).not.toEqual('New Title');

        // Multiple nodes selected
        store.commit('edit_modal/SELECT_NODE', exerciseIndex);
        store.commit('edit_modal/UPDATE_NODE', { copyright_holder: 'Copyright Holder' });
        expect(DEFAULT_VIDEO.copyright_holder).toEqual('Copyright Holder');
        expect(DEFAULT_EXERCISE.copyright_holder).toEqual('Copyright Holder');
      });
      it('SET_TAGS should add and remove tags based on payload', () => {
        // Add tag to one node
        store.commit('edit_modal/SET_NODE', videoIndex);
        store.commit('edit_modal/SET_TAGS', ['A']);
        expect(DEFAULT_VIDEO.tags).toHaveLength(1);
        expect(_.pluck(DEFAULT_VIDEO.tags, 'tag_name')).toContain('A');

        // Add tags to two nodes
        store.commit('edit_modal/SELECT_NODE', exerciseIndex);
        store.commit('edit_modal/SET_TAGS', ['B', 'C']);
        expect(DEFAULT_VIDEO.tags).toHaveLength(3);
        expect(_.pluck(DEFAULT_VIDEO.tags, 'tag_name')).toContain('A');
        expect(_.pluck(DEFAULT_VIDEO.tags, 'tag_name')).toContain('B');
        expect(_.pluck(DEFAULT_VIDEO.tags, 'tag_name')).toContain('C');
        expect(DEFAULT_EXERCISE.tags).toHaveLength(2);
        expect(_.pluck(DEFAULT_EXERCISE.tags, 'tag_name')).not.toContain('A');
        expect(_.pluck(DEFAULT_EXERCISE.tags, 'tag_name')).toContain('B');
        expect(_.pluck(DEFAULT_EXERCISE.tags, 'tag_name')).toContain('C');

        // Remove one tag from two nodes
        store.commit('edit_modal/SET_TAGS', ['B']);
        expect(DEFAULT_VIDEO.tags).toHaveLength(2);
        expect(_.pluck(DEFAULT_VIDEO.tags, 'tag_name')).toContain('A');
        expect(_.pluck(DEFAULT_VIDEO.tags, 'tag_name')).toContain('B');
        expect(_.pluck(DEFAULT_VIDEO.tags, 'tag_name')).not.toContain('C');
        expect(DEFAULT_EXERCISE.tags).toHaveLength(1);
        expect(_.pluck(DEFAULT_EXERCISE.tags, 'tag_name')).not.toContain('A');
        expect(_.pluck(DEFAULT_EXERCISE.tags, 'tag_name')).toContain('B');
        expect(_.pluck(DEFAULT_EXERCISE.tags, 'tag_name')).not.toContain('C');
      });
      it('UPDATE_EXTRA_FIELDS should set extra_fields on all selected nodes', () => {
        // Single node selected
        store.commit('edit_modal/SET_NODE', exerciseIndex);
        store.commit('edit_modal/UPDATE_EXTRA_FIELDS', { mastery_model: 'num_correct_in_a_row_5' });
        expect(DEFAULT_EXERCISE.extra_fields.mastery_model).toEqual('num_correct_in_a_row_5');
        expect(DEFAULT_EXERCISE2.extra_fields.mastery_model).not.toEqual('num_correct_in_a_row_5');

        // Multiple nodes selected
        store.commit('edit_modal/SELECT_NODE', exercise2Index);
        store.commit('edit_modal/UPDATE_EXTRA_FIELDS', { mastery_model: 'num_correct_in_a_row_3' });
        expect(DEFAULT_EXERCISE.extra_fields.mastery_model).toEqual('num_correct_in_a_row_3');
        expect(DEFAULT_EXERCISE2.extra_fields.mastery_model).toEqual('num_correct_in_a_row_3');
      });
    });
    describe('node creation', () => {
      it('ADD_NODE should add a node to the list of nodes', () => {
        let length = testNodes.length;
        expect(store.state.edit_modal.nodes).toHaveLength(length);
        store.commit('edit_modal/ADD_NODE', { kind: 'topic' });
        expect(store.state.edit_modal.nodes).toHaveLength(length + 1);
        expect(store.state.edit_modal.nodes[length].kind).toEqual('topic');
      });
      it('ADD_NODE should create a node based on window.preferences', () => {
        State.preferences = { author: 'Test author' };
        store.commit('edit_modal/ADD_NODE', { kind: 'exercise' });
        expect(store.state.edit_modal.nodes[testNodes.length - 1].author).toEqual('Test author');
      });
      it('REMOVE_NODE should remove a node from the list of nodes', () => {
        expect(store.state.edit_modal.nodes).toHaveLength(testNodes.length);
        store.commit('edit_modal/REMOVE_NODE', topic1Index);
        expect(store.state.edit_modal.nodes).toHaveLength(testNodes.length - 1);
      });
    });
  });

  describe('actions', () => {
    it('saveNodes should call api/contentnode endpoint', () => {
      store.dispatch('edit_modal/saveNodes');
      // TODO: api/contentnode endpoint should be called
    });
    it('loadNodes should call get_nodes_by_ids_complete endpoint', () => {
      store.dispatch('edit_modal/loadNodes', [0, 1]);
      // TODO: get_nodes_by_ids_complete endpoint should be called
    });
    it('removeNode should call delete_nodes endpoint', () => {
      store.dispatch('edit_modal/removeNode', 0);
      // TODO: delete_nodes endpoint should be called
    });
    it('copyNodes should call duplicate_nodes endpoint', () => {
      store.dispatch('edit_modal/copyNodes');
      // TODO: duplicate_nodes endpoint should be called
    });
  });
});
