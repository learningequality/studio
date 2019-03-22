
import _ from 'underscore';

export function SET_CHANNEL(state, channel) {
  state.channel = channel;
  state.nodes = [];
  state.nodes.push(channel.main_tree);
}

export function ADD_NODES(state, nodes) {
	_.each(nodes, (node) => {
		if(!_.findWhere(state.nodes, {id: node.id})) {
			state.nodes.push(node);
		}
	});
	console.log(nodes)
}

export function RESET(state) {
  Object.assign(state, {
    channel: null,
    nodes: []
  });
}
