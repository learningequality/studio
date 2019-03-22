var _ = require('underscore');
var Models = require('edit_channel/models');

export function loadNodes(context, nodeIDs) {
	return new Models.ContentNodeCollection()
						.get_all_fetch_simplified(nodeIDs)
						.then((collection) => {
							context.commit('ADD_NODES', collection.toJSON());
						});
}

export function publishChannel(context) {
	console.log(context.getters.channel)
}
