import _ from 'underscore';

export function SET_CHANNEL(state, channel) {
  state.channel = channel;
  state.nodes = [];
  state.nodes.push(channel.main_tree);
}

export function SET_CHANNEL_LANGUAGE(state, languageID) {
  state.channel.language = languageID;
}

export function ADD_NODES(state, nodes) {
  _.each(nodes, node => {
    if (!_.findWhere(state.nodes, { id: node.id })) {
      state.nodes.push(node);
    }
  });
}

export function RESET_STATE(state) {
  Object.assign(state, {
    channel: null,
    nodes: [],
  });
}
