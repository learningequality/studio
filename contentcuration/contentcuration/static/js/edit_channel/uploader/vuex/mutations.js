import _ from 'underscore';

export function RESET_STATE(state) {
  Object.assign(state, {
    nodes: [],
    selectedIndices: [],
  });
}

export function SET_NODES(state, nodes) {
  _.each(nodes, node => {
    node.changed = true;
  });
  state.nodes = nodes;
  state.selectedIndices = [0]; // TODO: remove
}

export function RESET_SELECTED(state) {
  state.selectedIndices = [];
}

export function SELECT_NODE(state, index) {
  state.selectedIndices.push(index);
}

export function DESELECT_NODE(state, index) {
  state.selectedIndices = _.reject(state.selectedIndices, i => {
    return i === index;
  });
}

export function SELECT_ALL_NODES(state) {
  state.selectedIndices = _.range(state.nodes.length);
}
