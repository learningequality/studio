import _ from 'underscore';

export function nodes(state) {
  return state.nodes;
}

export function getNode(state) {
  return function(index) {
    return state.nodes[index];
  };
}

export function selected(state) {
  return _.map(state.selectedIndices, index => {
    return state.nodes[index];
  });
}
