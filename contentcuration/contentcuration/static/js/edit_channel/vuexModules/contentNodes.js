import _ from 'underscore';
import get_cookie from 'utils/get_cookie';

const NODE_COMPLETE_LOAD = '_COMPLETE';
const NODE_BASE_LOAD = '_BASE';

function fetchNodes(contentNodeIDs, url) {
  return new Promise((resolve, reject) => {
    let promises = _.chain(contentNodeIDs)
      .chunk(50) // Chunk requests to avoid "Request Line is too large"
      .map(chunkedIDs => {
        return new Promise((fetchResolve, fetchReject) => {
          // No need to make a call to the server when list is empty
          if (chunkedIDs.length === 0) fetchResolve([]);
          $.ajax({
            method: 'GET',
            url: url(),
            data: { nodes: JSON.stringify(chunkedIDs) },
            error: fetchReject,
            success: fetchResolve,
          });
        });
      });

    Promise.all(promises.value())
      .then(values => {
        let nodes = {};
        _.each(_.flatten(values), node => (nodes[node.id] = node));
        resolve(nodes);
      })
      .catch(reject);
  });
}

const contentNodesModule = {
  state: {
    contentNodes: {},
    currentChannel: window.channel,
    currentUser: window.user,
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
      let updateMap = {};
      _.each(_.pairs(contentNodes), pair => {
        // Don't remove fields that aren't included in contentNodes data
        updateMap[pair[0]] = {
          ...(state.contentNodes[pair[0]] || {}),
          ...pair[1],
        };
      });

      state.contentNodes = {
        ...state.contentNodes,
        ...updateMap,
      };
    },
    REMOVE_NODES(state, contentNodeIDs) {
      _.each(contentNodeIDs, id => {
        delete state.contentNodes[id];
      });
    },
  },
  actions: {
    /* Base load functions- includes all metadata fields */
    loadNodes(context, contentNodeIDs) {
      // Load if node isn't in list or base data hasn't been loaded
      let fetchIDs = _.filter(
        contentNodeIDs,
        id => !context.state.contentNodes[id] || !context.state.contentNodes[id][NODE_BASE_LOAD]
      );
      return fetchNodes(fetchIDs, window.Urls.get_nodes_by_ids).then(nodes => {
        _.each(nodes, node => (node[NODE_BASE_LOAD] = true));
        context.commit('SET_NODES', nodes);
      });
    },
    reloadNodes(context, contentNodeIDs) {
      // Reload nodes
      return fetchNodes(contentNodeIDs, window.Urls.get_nodes_by_ids).then(nodes =>
        context.commit('SET_NODES', nodes)
      );
    },

    /* Simplified load functions- includes select metadata fields */
    loadNodesSimplified(context, contentNodeIDs) {
      // Load simplified data for nodes that aren't already in the state
      let fetchIDs = _.filter(contentNodeIDs, id => !context.state.contentNodes[id]);
      return fetchNodes(fetchIDs, window.Urls.get_nodes_by_ids_simplified).then(nodes =>
        context.commit('SET_NODES', nodes)
      );
    },
    reloadNodesSimplified(context, contentNodeIDs) {
      // Reload simplified nodes
      return fetchNodes(contentNodeIDs, window.Urls.get_nodes_by_ids_simplified).then(nodes =>
        context.commit('SET_NODES', nodes)
      );
    },

    /* Complete load functions- includes all metadata fields, files, assessment_items, etc. */
    loadNodesComplete(context, contentNodeIDs) {
      // Load if node isn't in list or complete data hasn't been loaded
      return new Promise((resolve, reject) => {
        let fetchIDs = _.filter(
          contentNodeIDs,
          id =>
            !context.state.contentNodes[id] || !context.state.contentNodes[id][NODE_COMPLETE_LOAD]
        );

        fetchNodes(fetchIDs, window.Urls.get_nodes_by_ids_complete)
          .then(nodes => {
            _.each(nodes, node => (node[NODE_COMPLETE_LOAD] = true));
            context.commit('SET_NODES', nodes);
            let returnData = {};
            _.each(contentNodeIDs, id => (returnData[id] = context.state.contentNodes[id]));
            resolve(returnData);
          })
          .catch(reject);
      });
    },

    /* Content node operations */
    saveNodes(context, payload) {
      // Some nodes may have extra_fields set to null, so make an empty dict instead
      _.each(payload, n => (n.extra_fields = n.extra_fields || {}));
      return new Promise((resolve, reject) => {
        $.ajax({
          method: 'PUT',
          url: window.Urls.contentnode_list(),
          data: JSON.stringify(payload),
          contentType: 'application/json',
          beforeSend: xhr => {
            xhr.setRequestHeader('X-CSRFToken', get_cookie('csrftoken'));
          },
          error: reject,
          success: data => {
            let savedData = {};
            _.each(data, node => (savedData[node.id] = node));
            context.commit('SET_NODES', savedData);
            resolve(savedData);
          },
        });
      });
      // // Load if node isn't in list or complete data hasn't been loaded
      // let fetchIDs = _.filter(contentNodeIDs, id =>
      //   !context.state.contentNodes[id] || !context.state.contentNodes[id][NODE_COMPLETE_LOAD]
      // );

      // return fetchNodes(fetchIDs, window.Urls.get_nodes_by_ids_complete).then(nodes => {
      //   _.each(nodes, node => node[NODE_COMPLETE_LOAD] = true);
      //   context.commit('SET_NODES', nodes);
      // });
    },

    copyNodes(context, payload) {
      // Used for both importing and copying to clipboard
      return new Promise((resolve, reject) => {
        let target = payload.target || context.state.currentUser.clipboard_tree;
        var data = {
          node_ids: payload.nodeIDs,
          sort_order: target.metadata.max_sort_order + 1,
          target_parent: target.id,
          channel_id: context.state.currentChannel.id,
        };
        $.ajax({
          method: 'POST',
          url: window.Urls.duplicate_nodes(),
          data: JSON.stringify(data),
          success: data => {
            resolve(context.dispatch('startTask', data));
          },
          error: reject,
        });
      });
    },

    deleteNodes(context, contentNodeIDs) {
      return new Promise((resolve, reject) => {
        var data = {
          nodes: contentNodeIDs,
          channel_id: context.state.currentChannel.id,
        };
        $.ajax({
          method: 'POST',
          url: window.Urls.delete_nodes(),
          data: JSON.stringify(data),
          success: resolve,
          error: reject,
        });
      });
    },
  },
};

module.exports = contentNodesModule;
