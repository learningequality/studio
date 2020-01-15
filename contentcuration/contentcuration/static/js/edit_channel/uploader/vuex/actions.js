import _ from 'underscore';

function filesAreValid(files) {
  let validPrimaryFiles = _.filter(
    files,
    f => !f.preset.supplementary && !f.error && f.progress >= 100
  );
  return validPrimaryFiles.length > 0;
}

export function saveNodes(context) {
  // Setting this before in case changes happen between saving start and finish
  return new Promise((resolve, reject) => {
    let changed = _.filter(context.state.nodes, n => {
      // Skip uploads
      return n.changesStaged && filesAreValid(n.files);
    });

    context
      .dispatch('saveNodes', changed, { root: true })
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
    context.dispatch('loadNodesComplete', _.pluck(nodes, 'id'), { root: true }).then(data => {
      context.commit('SET_LOADED_NODES', data);
    });
  }
}

/**
 * Validate node details and assessment items and save
 * validation results to state.validation.
 */
export const validateNode = ({ commit }, nodeIdx) => {
  commit('SANITIZE_NODE_ASSESSMENT_ITEMS', { nodeIdx });
  commit('SANITIZE_NODE_FILES', { nodeIdx });

  commit('VALIDATE_NODE_FILES', { nodeIdx });
  commit('VALIDATE_NODE_ASSESSMENT_ITEMS', { nodeIdx });
  commit('VALIDATE_NODE_DETAILS', { nodeIdx });
};

/**
 * Validate nodes and mark them as not new.
 */
export const prepareForSave = ({ dispatch, state }) => {
  state.nodes.forEach((node, nodeIdx) => {
    node.isNew = false;
    dispatch('validateNode', nodeIdx);
  });
};

export function removeNode(context, index) {
  let node = context.state.nodes[index];
  if (node.id) {
    context.dispatch('deleteNodes', [node.id], { root: true }).then(() => {
      context.commit('REMOVE_NODE', index);
    });
  } else {
    context.commit('REMOVE_NODE', index);
  }
}

export function copyNodes(context) {
  return new Promise(resolve => {
    let payload = { nodeIDs: _.pluck(context.state.nodes, 'id') };
    context.dispatch('copyNodes', payload, { root: true }).then(data => {
      resolve(data);
    });
  });
}
