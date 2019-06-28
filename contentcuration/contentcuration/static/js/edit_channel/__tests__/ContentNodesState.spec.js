import _ from 'underscore';

let State = require('../state');

const exampleNodes = {
  'node-1': {
    title: 'Node 1',
    id: 'node-1',
  },
  'node-2': {
    title: 'Node 2',
    id: 'node-2',
  },
};

describe('ContentNodeState', () => {
  beforeEach(() => {
    State.Store.commit('SET_NODES', exampleNodes);
  });
  describe('getters', () => {
    it('should return an array of nodes for contentNodeList', () => {
      expect(_.isArray(State.Store.getters.contentNodeList)).toBe(true);
      _.each(State.Store.getters.contentNodeList, node => {
        let match = State.Store.state.topicTree.contentNodes[node.id];
        expect(match).toBeTruthy();
        expect(match.title === node.title).toBe(true);
      });
    });
  });
  describe('mutations', () => {
    it('should set contentNodes on SET_NODES', () => {
      _.each(_.pairs(State.Store.state.topicTree.contentNodes), pair => {
        expect(exampleNodes[pair[0]]).toBeTruthy();
        expect(_.isEqual(exampleNodes[pair[0]], pair[1])).toBe(true);
      });
    });
    it('should remove contentNodeIDs from contentNodes on REMOVE_NODES', () => {
      State.Store.commit('REMOVE_NODES', ['node-1']);
      expect(State.Store.state.topicTree.contentNodes['node-1']).toBeFalsy();
      expect(State.Store.state.topicTree.contentNodes['node-2']).toBeTruthy();
    });
  });
  describe('actions', () => {
    describe('basic loading', () => {
      it('should load nodes based on contentNodeIDs on loadNodes', () => {
        State.Store.dispatch('loadNodes', ['node-3']);
        // TODO: mock ajax once we remove backbone, get_nodes_by_ids should be called
        // and node with id `node-3` should be added
      });
      it('should reload nodes based on contentNodeIDs on reloadNodes', () => {
        State.Store.dispatch('reloadNodes', ['node-1']);
        // TODO: mock ajax once we remove backbone, get_nodes_by_ids should be called
        // and node with id `node-1` should be updated
      });
    });

    describe('simplified loading', () => {
      it('should load nodes based on contentNodeIDs on loadNodesSimplified', () => {
        State.Store.dispatch('loadNodesSimplified', ['node-3']);
        // TODO: mock ajax once we remove backbone, get_nodes_by_ids_simplified should be called
        // and node with id `node-3` should be added
      });
      it('should reload nodes based on contentNodeIDs on reloadNodesSimplified', () => {
        State.Store.dispatch('reloadNodesSimplified', ['node-1']);
        // TODO: mock ajax once we remove backbone, get_nodes_by_ids_simplified should be called
        // and node with id `node-1` should be updated
      });
    });

    describe('complete loading', () => {
      it('should load nodes based on contentNodeIDs on loadNodesComplete', () => {
        State.Store.dispatch('loadNodesComplete', ['node-1', 'node-3']);
        // TODO: mock ajax once we remove backbone, get_nodes_by_ids_complete should be called
        // and node with ids `node-1` and `node-3` should be added with file data
      });
    });
  });
});
