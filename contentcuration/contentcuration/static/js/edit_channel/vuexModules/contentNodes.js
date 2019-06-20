import _ from 'underscore';

function fetchNodes(state, contentNodeIDs, url, loadAll) {
  return new Promise((resolve, reject) => {
    let promises = _.chain(contentNodeIDs)
      .filter(nodeID => loadAll || !state.contentNodes[nodeID])
      .chunk(50) // Chunk requests to avoid "Request Line is too large"
      .map(filteredIDs => {
        return new Promise((fetchResolve, fetchReject) => {
          // No need to make a call to the server when list is empty
          if (filteredIDs.length === 0) fetchResolve([]);
          $.ajax({
            method: 'GET',
            url: url(filteredIDs.join(',')),
            error: fetchReject,
            success: fetchResolve,
          });
        });
      })
      .value();

    Promise.all(promises)
      .then(values => {
        let nodes = {};
        _.each(_.flatten(values), node => {
          nodes[node.id] = node;
        });
        resolve(nodes);
      })
      .catch(reject);
  });
}

const contentNodesModule = {
  state: {
    contentNodes: {},
  },
  getters: {
    contentNodeList(state) {
      return _.values(state.contentNodes);
    },
  },
  mutations: {
    SET_NODES(state, contentNodes) {
      /*
        Set nodes on global state
        contentNodes = {id: <object>}
      */
      state.contentNodes = {
        ...state.contentNodes,
        ...contentNodes,
      };
    },
    REMOVE_NODES(state, contentNodeIDs) {
      _.each(contentNodeIDs, id => {
        delete state.contentNodes[id];
      });
    },
  },
  actions: {
    loadNodes(context, contentNodeIDs) {
      // Load nodes that aren't already in the state
      fetchNodes(context.state, contentNodeIDs, window.Urls.get_nodes_by_ids).then(nodes =>
        context.commit('SET_NODES', nodes)
      );
    },
    reloadNodes(context, contentNodeIDs) {
      // Reload nodes
      fetchNodes(context.state, contentNodeIDs, window.Urls.get_nodes_by_ids, true).then(nodes =>
        context.commit('SET_NODES', nodes)
      );
    },
    loadNodesSimplified(context, contentNodeIDs) {
      // Load simplified data for nodes that aren't already in the state
      fetchNodes(context.state, contentNodeIDs, window.Urls.get_nodes_by_ids_simplified).then(
        nodes => context.commit('SET_NODES', nodes)
      );
    },
    reloadNodesSimplified(context, contentNodeIDs) {
      // Reload simplified nodes
      fetchNodes(context.state, contentNodeIDs, window.Urls.get_nodes_by_ids_simplified, true).then(
        nodes => context.commit('SET_NODES', nodes)
      );
    },
    loadNodesComplete(context, contentNodeIDs) {
      // Load nodes along with files, assessment_items, etc.
      fetchNodes(context.state, contentNodeIDs, window.Urls.get_nodes_by_ids_complete, true).then(
        nodes => context.commit('SET_NODES', nodes)
      );
    },
  },
};

module.exports = contentNodesModule;
