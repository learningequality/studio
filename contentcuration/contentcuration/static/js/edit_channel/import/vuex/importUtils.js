var Models = require('../../models');
const State = require('../../state');

/** Given an Array of ContentNode Objects, create a ContentNodeCollection
 * @param {Array<ContentNode>} contentNodes
 * @returns {ContentNodeCollection}
 */
exports.createContentNodeCollection = function(contentNodes) {
  return new Models.ContentNodeCollection(contentNodes);
};

// Utility function that fetches importable/accessible channels
exports.fetchImportableChannels = function() {
  return State.current_channel.get_accessible_channel_roots().then(function modify(channels) {
    channels.forEach(function(channel) {
      // All channels are topics at the top level
      channel.set('kind', 'topic');
    });
    return channels.toJSON();
  });
};
