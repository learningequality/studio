var Models = require('../models');

/** Given an Array of ContentNode Objects, create a ContentNodeCollection
 * @param {Array<ContentNode>} contentNodes
 * @returns {ContentNodeCollection}
 */
function createContentNodeCollection(contentNodes) {
  return new Models.ContentNodeCollection(contentNodes);
}

function hasRelatedContent(contentNodes) {
  var collection = createContentNodeCollection(contentNodes);
  return collection.has_related_content();
}

/**
 * Given an Array of ContentNode IDs, return an Array of the corresponding ContentNode Objects
 * @param {Array<string>} nodeIds
 * @returns {Promise<Array<ContentNode>>}
 */
function fetchContentNodesById(nodeIds) {
    var collection = new Models.ContentNodeCollection();
    return collection.get_all_fetch_simplified(nodeIds)
    .then(function(nodeCollection) {
        return nodeCollection.toJSON();
    });
}

function fetchItemSearchResults(searchTerm, currentChannelId) {
  return new Promise(function(resolve, reject) {
    $.ajax({
      method:"GET",
      // omitting slash results in 301
      url: '/api/search/items/',
      success: resolve,
      error: reject,
      data: {
        q: searchTerm,
        exclude_channel: currentChannelId || '',
      },
    });
  });
}

// move to util
function fetchTopicSearchResults(searchTerm, currentChannelId) {
  return new Promise(function(resolve, reject) {
    $.ajax({
      method:"GET",
      url: '/api/search/topics/',
      success: resolve,
      error: reject,
      data: {
        q: searchTerm,
        exclude_channel: currentChannelId || '',
      },
    });
  });
}

function fetchSearchResults(searchTerm, currentChannelId) {
  return Promise.all([
    fetchItemSearchResults(searchTerm, currentChannelId),
    fetchTopicSearchResults(searchTerm, currentChannelId),
  ])
  .then(function(results) {
    return {
      searchTerm: searchTerm,
      itemResults: results[0],
      topicResults: results[1],
    }
  })
}

function getIconClassForKind(kind) {
  switch (kind){
    case "topic":
      return "glyphicon-folder-close";
    case "video":
      return "glyphicon-film";
    case "audio":
      return "glyphicon-headphones";
    case "image":
      return "glyphicon-picture";
    case "exercise":
      return "glyphicon-star";
    case "document":
      return "glyphicon-file";
    case "html5":
      return "glyphicon-certificate";
    default:
      return "glyphicon-exclamation-sign";
  }
}

module.exports = {
  createContentNodeCollection: createContentNodeCollection,
  fetchContentNodesById: fetchContentNodesById,
  fetchItemSearchResults: fetchItemSearchResults,
  fetchTopicSearchResults: fetchTopicSearchResults,
  fetchSearchResults: fetchSearchResults,
  getIconClassForKind: getIconClassForKind,
  hasRelatedContent: hasRelatedContent,
};
