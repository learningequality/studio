var Vue = require('vue');
var Models = require("edit_channel/models");

function fetchChannelRoots() {
  return window.current_channel.get_accessible_channel_roots();
}

/** Given an Array of ContentNode Objects, create a ContentNodeCollection
 * @param {Array<ContentNode>} contentNodes
 * @returns {ContentNodeCollection}
 */
function createContentNodeCollection(contentNodes) {
    return new Models.ContentNodeCollection(contentNodes);
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

function updateCounts(totals, node) {
    var counts = node.metadata;
    // if a leaf node
    if (counts.resource_count === 1) {
        return {
            resourceCount: totals.resourceCount + 1,
            topicCount: totals.topicCount,
        };
    }
    // if a topic node
    return {
        resourceCount: totals.resourceCount + counts.resource_count,
        topicCount: totals.topicCount + counts.total_count - counts.resource_count + 1,
    };
}

// $options include onConfirmImport and baseViewModel
var ImportListStore = Vue.extend({
    data: function() {
        return {
            itemsToImport: [],
            totalImportSize: 0,
            pageState: {
                type: 'tree_view',
                data: {},
            },
        };
    },
    computed: {
        resourceCounts: function() {
            return this.itemsToImport.reduce(updateCounts, {
                resourceCount: 0,
                topicCount: 0,
            });
        },
        eventTypes: function() {
            return {
                START_IMPORT: 'start_import',
                FINISH_IMPORT: 'finish_import',
            };
        },
    },
    watch: {
        itemsToImport: function(newVal) {
            this.getImportSize(newVal)
            .then(function(size) {
                this.totalImportSize = size;
            }.bind(this));
        },
    },
    methods: {
        goToSearchResults: function(searchTerm) {
            this.itemsToImport = [],
            this.pageState = {
                type: 'search_results',
                data: {
                    searchTerm: searchTerm,
                },
            };
        },
        goToTreeViewPage: function() {
            this.itemsToImport = [],
            this.pageState = {
                type: 'tree_view',
                data: {},
            };
        },
        fetchContentNodesById: fetchContentNodesById,
        createContentNodeCollection: createContentNodeCollection,
        fetchChannelRoots: fetchChannelRoots,
        addItemToImport: function(contentNode) {
            this.itemsToImport.push(contentNode);
        },
        removeItemToImport: function(nodeId) {
            this.itemsToImport = this.itemsToImport.filter(function(node) {
                return node.id !== nodeId;
            }.bind(this));
        },
        getImportCollection: function() {
            return this.createContentNodeCollection(this.itemsToImport);
        },
        // takes an array of ContentNodes, and returns their size in bytes
        getImportSize: function(contentNodes) {
            var collection = this.createContentNodeCollection(contentNodes);
            return collection.calculate_size()
        },
        commitImport: function() {
            // event for ImportModalView
            this.$emit(this.eventTypes.START_IMPORT);
            this.getImportCollection()
            .duplicate(this.$options.baseViewModel)
            .then(function(collection) {
                // event for ImportModalView
                this.$options.onConfirmImport(collection);
                this.$emit(this.eventTypes.FINISH_IMPORT);
            }.bind(this));
        }
    },
});

module.exports = ImportListStore;
