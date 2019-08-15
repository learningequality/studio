import _ from 'underscore';

export function getSelected(state) {
  return _.map(state.selectedIndices, index => state.nodes[index]);
}
