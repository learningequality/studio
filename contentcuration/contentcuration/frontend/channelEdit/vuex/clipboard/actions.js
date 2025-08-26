import get from 'lodash/get';
import partition from 'lodash/partition';
import chunk from 'lodash/chunk';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';
import defer from 'lodash/defer';
import { Vibrant } from 'node-vibrant/browser';
import { ClipboardNodeFlag, LoadStatus, SelectionFlags } from './constants';
import { selectionId, isLegacyNode, isExcludedNode, addExcludedNode } from './utils';
import { promiseChunk } from 'shared/utils/helpers';
import { Clipboard } from 'shared/data/resources';

const root = true;

// Union for the ALL state (5)
const SELECT_ALL = SelectionFlags.SELECTED | SelectionFlags.ALL_DESCENDANTS;

export function initialize(context) {
  context.commit('SET_INITIALIZING', true);

  const clipboardRootId = context.rootGetters['clipboardRootId'];
  context.commit('UPDATE_SELECTION_STATE', {
    id: clipboardRootId,
    selectionState: SelectionFlags.NONE,
  });

  return context
    .dispatch('loadClipboardNodes', { parent: clipboardRootId })
    .then(nodes =>
      context.dispatch('loadChannels', {
        id__in: nodes.map(node => node.source_channel_id),
      }),
    )
    .then(() => {
      context.dispatch('loadChannelColors');
      context.commit('SET_INITIALIZING', false);
    });
}

export function loadChannels(context, { id__in }) {
  id__in = uniq(id__in.filter(Boolean));
  if (id__in.length === 0) {
    return [];
  }

  // Ensure that if have selected all, that when new channel gets added,
  // its selection state is in-sync
  const allSelected = context.getters.currentSelectionState(context.rootGetters['clipboardRootId']);
  return promiseChunk(id__in, 50, id__in => {
    // Load up the source channels
    return context.dispatch('channel/loadChannelList', { id__in }, { root: true });
  }).then(channels => {
    // Add the channel to the selected state, it acts like a node
    channels.forEach(channel => {
      if (!(channel.id in context.state.selected)) {
        context.commit('UPDATE_SELECTION_STATE', {
          id: channel.id,
          selectionState: allSelected ? SELECT_ALL : SelectionFlags.NONE,
        });
      }
    });

    return channels;
  });
}

export function loadClipboardNodes(context, { parent }) {
  const clipboardRootId = context.rootGetters['clipboardRootId'];

  // When loading for root, or if legacy, use Clipboard resource
  // a. Legacy clipboard nodes actually live in the clipboard tree, which this handles
  // b. Only the ancestor (child of root) of a new clipboard node lives in the clipboard tree
  if (parent === clipboardRootId || context.getters.isLegacyNode(parent)) {
    return Clipboard.where({ parent }).then(clipboardNodes => {
      if (!clipboardNodes.length) {
        return [];
      }

      const [legacyNodes, nodes] = partition(clipboardNodes, isLegacyNode);
      const nodeIdChannelIdPairs = uniqBy(nodes, c => c.source_node_id + c.source_channel_id).map(
        c => [c.source_node_id, c.source_channel_id],
      );
      const legacyNodeIds = legacyNodes.map(n => n.id);

      return Promise.all([
        // To avoid error code 414 URI Too Long errors, we chunk the pairs
        // Given URI limit is 2000 chars:
        // base URL at 100 chars + each pair at 70 chars = max 27 pairs
        ...chunk(nodeIdChannelIdPairs, 25).map(chunkPairs =>
          context.dispatch(
            'contentNode/loadContentNodes',
            { '[node_id+channel_id]__in': chunkPairs },
            { root },
          ),
        ),
        // Chunk legacy nodes, double the size since not pairs
        ...chunk(legacyNodeIds, 50).map(legacyChunk =>
          context.dispatch('contentNode/loadContentNodes', { id__in: legacyChunk }, { root }),
        ),
      ]).then(() => {
        return context.dispatch('addClipboardNodes', {
          nodes: clipboardNodes,
          parent,
        });
      });
    });
  }

  // Since this must be a new clipboard node that's not the top-level ancestor, we'll need
  // to find the real parent (which should already be loaded into contentNode Vuex state) and use
  // it to load its real children. We also get the ancestor node, for uniquely referencing this
  // copy of the source node in the clipboard
  const contentNode = context.getters.getContentNodeForRender(parent);
  const ancestor = context.getters.getClipboardAncestorNode(parent);
  if (!ancestor) {
    throw new Error('Unexpected null ancestor');
  }

  if (contentNode && contentNode.resource_count > 0) {
    return context
      .dispatch('contentNode/loadContentNodes', { parent: contentNode.id }, { root: true })
      .then(nodes => {
        // Ensure we don't add excluded nodes to our Vuex map
        nodes = nodes
          .filter(node => !isExcludedNode(ancestor, node))
          .map(node => ({
            // For new version clipboard nodes, we don't need `node.id` for anything
            // so we can change it, and the clipboard should not be manipulating the
            // source node anyway, normally requiring its ID. So we create a virtual
            // clipboard node based off the source, since only its root ancestor
            // exists in the literal clipboard tree
            id: selectionId(node.id, ancestor.id),
            kind: node.kind,
            parent,
            lft: node.lft,
            source_node_id: node.node_id,
            source_channel_id: node.channel_id,
            total_count: node.total_count,
            resource_count: node.resource_count,
            // Be sure to set this flag for this as a new-versioned node
            extra_fields: {
              [ClipboardNodeFlag]: true,
            },
          }));

        return context.dispatch('addClipboardNodes', {
          nodes,
          parent,
        });
      });
  }
  return [];
}

export function addClipboardNodes(context, { nodes, parent }) {
  const isRootInsert = parent === context.rootGetters['clipboardRootId'];
  nodes.forEach(node => {
    // Add selection state
    if (!(node.id in context.state.selected)) {
      // This is referencing what the "parent" is in the clipboard UI for determining
      // selection inheritance
      const selectionParent = isRootInsert ? node.source_channel_id : node.parent;

      // Determine parent selection state so we can add new descendant nodes
      // with the appropriate selection state
      const parentSelection = context.getters.currentSelectionState(selectionParent);

      context.commit('UPDATE_SELECTION_STATE', {
        id: node.id,
        selectionState:
          parentSelection & SelectionFlags.ALL_DESCENDANTS ? SELECT_ALL : SelectionFlags.NONE,
      });
    }
  });

  context.commit('ADD_CLIPBOARD_NODES', nodes);
  return nodes;
}

/**
 * Dedicated Vuex action for loading nodes from the IndexedDB listener
 */
export function addClipboardNodeFromListener(context, obj) {
  let promise = Promise.resolve();

  // Load channel and create color if not already present on the clipboard
  if (!context.getters.channelIds.includes(obj.source_channel_id)) {
    promise = context.dispatch('loadChannels', { id__in: [obj.source_channel_id] });
  }

  return promise
    .then(() =>
      context.dispatch(
        'contentNode/loadContentNodes',
        { '[node_id+channel_id]__in': [[obj.source_node_id, obj.source_channel_id]] },
        { root },
      ),
    )
    .then(() =>
      context.dispatch('addClipboardNodes', {
        nodes: [obj],
        parent: obj.parent,
      }),
    )
    .then(() => context.dispatch('loadChannelColors'));
}

let preloadPromise = Promise.resolve();
/**
 * Queues request to load the clipboard nodes, and returns a promise
 * when this particular set is loaded
 *
 * @param context
 * @param {{ parent: String }} payload
 * @return {Promise<Boolean>}
 */
export function preloadClipboardNodes(context, { parent }) {
  context.commit('SET_PRELOAD_NODES', {
    [parent]: LoadStatus.NOT_LOADED,
  });
  preloadPromise = preloadPromise.then(() => {
    return context
      .dispatch('doPreloadClipboardNodes', { parent })
      .then(() => new Promise(resolve => defer(resolve)));
  });
  return preloadPromise;
}

export function doPreloadClipboardNodes(context, { parent }) {
  if (context.state.preloadNodes[parent] === LoadStatus.NOT_LOADED) {
    context.commit('SET_PRELOAD_NODES', {
      [parent]: LoadStatus.PRELOADING,
    });
    return context.dispatch('loadClipboardNodes', { parent }).then(() =>
      context.commit('SET_PRELOAD_NODES', {
        [parent]: LoadStatus.LOADED,
      }),
    );
  }
}

/**
 * @param context
 * @param {{ parent: String }} payload
 */
export function cancelPreloadClipboardNodes(context, { parent }) {
  context.commit('REMOVE_PRELOAD_NODES', parent);
}

export function resetPreloadClipboardNodes(context) {
  context.commit('RESET_PRELOAD_NODES');
}

// Here are the swatches Vibrant gives, and the order we'll check them for colors we can use.
const colorChoiceOrder = [
  'Vibrant',
  'LightVibrant',
  'DarkVibrant',
  'LightMuted',
  'Muted',
  'DarkMuted',
];

export function loadChannelColors(context) {
  // Reducing the channels, going one by one processing colors, and collection an array
  // of all of them
  return context.getters.channels.reduce(
    (promise, channel) => {
      const src = channel.thumbnail_encoding['base64']
        ? channel.thumbnail_encoding['base64']
        : channel.thumbnail_url;

      // If we already have the color, just no src, then we'll just skip
      if (context.getters.getChannelColor(channel.id) || !src) {
        return promise;
      }

      const image = new Image();
      image.src = src;

      //
      return promise.then(allColors => {
        return Vibrant.from(image)
          .getPalette()
          .then(palette => {
            let color = null;

            if (palette) {
              const colors = colorChoiceOrder.map(name => palette[name].getHex());
              // Find the first color that we don't already have
              color = colors.find(color => !allColors.includes(color)) || color;
              allColors.push(color);
            }

            // Add it now so the user can see it
            context.commit('ADD_CHANNEL_COLOR', { id: channel.id, color });
            return allColors;
          })
          .catch(() => {
            return allColors;
          });
      });
    },
    Promise.resolve(Object.values(context.state.channelColors)),
  );
}

export function doCopy(context, { node_id, channel_id, extra_fields = {} }) {
  const clipboardRootId = context.rootGetters['clipboardRootId'];
  extra_fields[ClipboardNodeFlag] = true;
  // This copies a "bare" copy, if you want a full content node copy,
  // go to the contentNode state actions
  return Clipboard.copy(node_id, channel_id, clipboardRootId, extra_fields);
}

/**
 * @param context
 * @param {String} node_id
 * @param {String} channel_id
 * @param {Object} extra_fields
 * @return {Promise<void>}
 */
export function copy(context, { node_id, channel_id, extra_fields = {} }) {
  return context.dispatch('doCopy', { node_id, channel_id, extra_fields }).then(node => {
    return context.dispatch('loadChannels', { id__in: [channel_id] }).then(() =>
      context.dispatch('addClipboardNodes', {
        nodes: [node],
        parent: context.rootGetters['clipboardRootId'],
      }),
    );
  });
}

/*
 * For convenience, this function takes an array of nodes as the argument,
 * to consolidate any uniquefying.
 */
export function copyAll(context, { nodes }) {
  const sources = uniqBy(nodes, c => c.node_id + c.channel_id)
    .map(n => ({ node_id: n.node_id, channel_id: n.channel_id }))
    .filter(n => n.node_id && n.channel_id);

  // Pick new channel IDs
  const channelIds = sources
    .map(n => n.channel_id)
    .filter(channelId => {
      return !context.getters.channelIds.includes(channelId);
    });

  return promiseChunk(sources, 20, sourcesChunk => {
    return Promise.all(sourcesChunk.map(source => context.dispatch('doCopy', source)));
  }).then(nodes => {
    return context.dispatch('loadChannels', { id__in: channelIds }).then(() =>
      context.dispatch('addClipboardNodes', {
        nodes,
        parent: context.rootGetters['clipboardRootId'],
      }),
    );
  });
}

/**
 * Recursive function to set selection state for a node, and possibly it's ancestors and descendants
 */
export function setSelectionState(context, { id, selectionState, deep = true, parents = true }) {
  const currentState = context.getters.currentSelectionState(id);

  // Well, we should only bother if it needs updating
  if (currentState !== selectionState) {
    context.commit('UPDATE_SELECTION_STATE', { id, selectionState });
  } else if (!deep && !parents) {
    return;
  }

  // Does this change cascade to the children? If so, and we're going `deep` then
  // cascade down what should happen
  if (deep && (!(selectionState & SelectionFlags.INDETERMINATE) || currentState > SELECT_ALL)) {
    // Update descendants
    context.getters.getClipboardChildren(id).forEach(({ id }) => {
      context.dispatch('setSelectionState', {
        id,
        selectionState: selectionState === SELECT_ALL ? SELECT_ALL : SelectionFlags.NONE,
        parents: false,
      });
    });
  }

  const parentId = context.getters.getClipboardParentId(id);
  if (parents && parentId) {
    // Updating the parents at this point is fairly easy, we just recurse upwards, recomputing
    // the new state for the parent
    context.dispatch('setSelectionState', {
      id: parentId,
      selectionState: context.getters.getSelectionState(parentId),
      deep: false,
    });
  }
}

/**
 * Global deselect all!
 */
export function resetSelectionState(context) {
  const clipboardTreeId = context.rootGetters['clipboardRootId'];
  return context.dispatch('setSelectionState', {
    id: clipboardTreeId,
    selectionState: SelectionFlags.NONE,
    deep: true,
  });
}

export function deleteClipboardNode(context, { id }) {
  const ancestor = context.getters.getClipboardAncestorNode(id);
  if (!ancestor) {
    throw new Error('Unexpected null ancestor');
  }

  // if ID references node that is child of clipboard root, then we can
  // delete it all, likewise with a legacy node
  if (ancestor.id === id || context.getters.isLegacyNode(id)) {
    return Clipboard.delete(id).then(() => {
      context.commit('REMOVE_CLIPBOARD_NODE', { id });
    });
  }

  // The node must be a new version clipboard node that's not the top level ancestor, so
  // update the ancestor's exclusion data
  const contentNode = context.getters.getContentNodeForRender(id);
  if (contentNode) {
    const { extra_fields } = addExcludedNode(ancestor, contentNode);
    // Otherwise we have a non clipboard node
    return Clipboard.update(ancestor.id, { extra_fields }).then(() => {
      context.commit('ADD_CLIPBOARD_NODE', ancestor);
      context.commit('REMOVE_CLIPBOARD_NODE', { id });
    });
  }
}

export function deleteClipboardNodes(context, ids) {
  return Promise.all(
    ids.map(id => {
      // Going through list of ids to delete, we make sure to detect if the parent or top-level
      // ancestor is also included in the array to avoid unnecessary delete calls
      const clipboardNode = context.state.clipboardNodesMap[id];
      const ancestor = context.getters.getClipboardAncestorNode(id);
      if (
        (clipboardNode && ids.includes(clipboardNode.parent)) ||
        (ancestor && ancestor.id !== id && ids.includes(ancestor.id))
      ) {
        context.commit('REMOVE_CLIPBOARD_NODE', { id });
        return Promise.resolve();
      }

      return deleteClipboardNode(context, { id });
    }),
  );
}

export function deleteLegacyNodes(context, ids) {
  return Clipboard.deleteLegacyNodes(ids).then(() => {
    ids.forEach(id => context.commit('REMOVE_CLIPBOARD_NODE', { id }));
  });
}

export function moveClipboardNodes(context, { legacyTrees, newTrees, target }) {
  const promises = [];
  if (legacyTrees.length) {
    promises.push(
      context.dispatch(
        'contentNode/moveContentNodes',
        { id__in: legacyTrees.map(tree => tree.id), parent: target },
        { root: true },
      ),
    );
  }
  if (newTrees.length) {
    for (const copyNode of newTrees) {
      promises.push(
        context.dispatch(
          'contentNode/copyContentNode',
          {
            id: copyNode.id,
            target,
            excluded_descendants: get(copyNode, ['extra_fields', 'excluded_descendants'], null),
          },
          { root: true },
        ),
      );
    }
  }
  return Promise.all(promises).then(() => {
    const deletionPromises = [];
    if (newTrees.length) {
      deletionPromises.push(
        context.dispatch(
          'deleteClipboardNodes',
          newTrees.map(copyNode => copyNode.clipboardNodeId),
        ),
      );
    }
    if (legacyTrees.length) {
      deletionPromises.push(
        context.dispatch(
          'deleteLegacyNodes',
          legacyTrees.map(tree => tree.id),
        ),
      );
    }
    return Promise.all(deletionPromises);
  });
}

export function setPreviewNode(context, { id }) {
  context.commit('SET_PREVIEW_NODE', id);
}

export function resetPreviewNode(context) {
  context.commit('SET_PREVIEW_NODE', null);
}
