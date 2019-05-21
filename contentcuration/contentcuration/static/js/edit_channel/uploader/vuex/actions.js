// import State from 'edit_channel/state';

import Models from 'edit_channel/models';

export function saveNodes(context) {
  // Setting this before in case changes happen between saving start and finish
  _.each(context.state.nodes, node => (node.changesStaged = false));
  return new Promise(resolve => {
    // ADD SAVE LOGIC HERE
    setTimeout(resolve, 5000);
  });
}

export function loadNodes(context, nodeIDs) {
  $.ajax({
    method: 'GET',
    url: window.Urls.get_nodes_by_ids_complete(),
    data: { nodes: JSON.stringify(nodeIDs) },
    success: data => {
      context.commit('SET_LOADED_NODES', data);
    },
  });
}

export function removeNode(context, index) {
  let node = context.state.nodes[index];
  if (node.id) {
    new Models.ContentNodeModel({ id: node.id }).destroy({
      success: () => {
        context.commit('REMOVE_NODE', index);
      },
    });
  } else {
    context.commit('REMOVE_NODE', index);
  }
}
