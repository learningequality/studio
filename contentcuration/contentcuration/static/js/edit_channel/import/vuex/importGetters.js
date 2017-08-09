var _ = require('underscore');

// ID of the Channel being edited
exports.currentChannelId = function() {
  return window.current_channel.get('id');
}

// Utility function for importedResourceCounts
function updateCounts(totals, node) {
  var counts = node.metadata;
  // if a leaf node
  if (node.kind !== 'topic') {
    return {
      resources: totals.resources + 1,
      topics: totals.topics,
    };
  }
  // if a topic node
  return {
    resources: totals.resources + counts.resource_count,
    topics: totals.topics + counts.total_count - counts.resource_count + 1,
  };
}

// Folds over the `itemsToImport` array, and tallys resources/topics based
// on metadata of the items.
exports.importedItemCounts = function(state) {
  return state.itemsToImport.reduce(updateCounts, {
    resources: 0,
    topics: 0,
  })
}

// Name of the current ImportModal page
exports.currentImportPage = function(state) {
  return state.pageState.pageType;
}

// Array of IDs from itemsToImport
exports.itemsToImportIds = function(state) {
  return _.pluck(state.itemsToImport, 'id');
}

// Current search term, when on Search Results page
exports.currentSearchTerm = function(state, getters, rootState) {
  return rootState.import.pageState.data.searchTerm || '';
}
