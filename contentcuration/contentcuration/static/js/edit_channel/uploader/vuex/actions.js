// import State from 'edit_channel/state';

// import Models from 'edit_channel/models';

export function saveNodes(context) {
  return new Promise(resolve => {
    // ADD SAVE LOGIC HERE
    _.each(context.state.nodes, node => (node.changesStaged = false));
    setTimeout(resolve, 1000);
  });
}
