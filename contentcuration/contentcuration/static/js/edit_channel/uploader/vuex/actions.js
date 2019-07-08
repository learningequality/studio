import _ from 'underscore';
import State from 'edit_channel/state';

export function saveNodes(context) {
  // Setting this before in case changes happen between saving start and finish
  return new Promise((resolve, reject) => {
    let changed = _.where(context.state.nodes, { changesStaged: true });

    State.Store.dispatch('saveNodes', changed)
      .then(data => {
        context.commit('SET_LOADED_NODES', data);
        resolve();
      })
      .catch(reject);
  });
}

export function loadNodes(context, indices) {
  let nodes = _.filter(
    context.state.nodes,
    (node, i) => node.id && indices.includes(i) && !node._COMPLETE
  );
  if (nodes.length) {
    State.Store.dispatch('loadNodesComplete', _.pluck(nodes, 'id')).then(data => {
      context.commit('SET_LOADED_NODES', data);
    });
  }
}

export function prepareForSave({ commit, state }) {
  commit('PREP_NODES_FOR_SAVE');

  for (const nodeId of Object.keys(state.nodesAssessmentDrafts)) {
    commit('sanitizeNodeAssessmentDraft', { nodeId });
    commit('validateNodeAssessmentDraft', { nodeId });
  }
}

export function removeNode(context, index) {
  let node = context.state.nodes[index];
  if (node.id) {
    State.Store.dispatch('deleteNodes', [node.id]).then(() => {
      context.commit('REMOVE_NODE', index);
    });
  } else {
    context.commit('REMOVE_NODE', index);
  }
}

export function copyNodes(context) {
  return new Promise(resolve => {
    let payload = { nodeIDs: _.pluck(context.state.nodes, 'id') };
    State.Store.dispatch('copyNodes', payload).then(data => {
      resolve(data);
    });
  });
}
