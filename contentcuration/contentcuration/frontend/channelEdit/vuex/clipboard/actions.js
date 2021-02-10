import get from 'lodash/get';
import partition from 'lodash/partition';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';
import defer from 'lodash/defer';
import * as Vibrant from 'node-vibrant';
import { ClipboardNodeFlag, SelectionFlags } from './constants';
import { selectionId, isLegacyNode, preloadKey } from './utils';
import { promiseChunk } from 'shared/utils/helpers';
import { Clipboard } from 'shared/data/resources';

/**
 * @param context
 * @param {Object[]} clipboardNodes
 * @return {Promise}
 * @private
 */
function _loadClipboardNodes(context, clipboardNodes) {
  const root = true;
  const [legacyNodes, nodes] = partition(clipboardNodes, isLegacyNode);
  const nodeIdChannelIdPairs = uniqBy(
    nodes,
    c => c.source_node_id + c.source_channel_id
  ).map(c => [c.source_node_id, c.source_channel_id]);
  const legacyNodeIds = legacyNodes.map(n => n.id);

  return Promise.all([
    context.dispatch(
      'contentNode/loadContentNodes',
      { '[node_id+channel_id]__in': nodeIdChannelIdPairs },
      { root }
    ),
    context.dispatch('contentNode/loadContentNodes', { id__in: legacyNodeIds }, { root }),
  ]);
}

export function loadChannels(context) {
  const clipboardRootId = context.rootGetters['clipboardRootId'];
  return Clipboard.where({ parent: clipboardRootId }).then(clipboardNodes => {
    if (!clipboardNodes.length) {
      return [];
    }

    // Find the channels we need to load
    const channelIds = uniq(
      clipboardNodes.map(clipboardNode => clipboardNode.source_channel_id).filter(Boolean)
    );
    return promiseChunk(channelIds, 50, id__in => {
      // Load up the source channels
      return context.dispatch('channel/loadChannelList', { id__in }, { root: true });
    })
      .then(channels => {
        // Add the channel to the selected state, it acts like a node
        channels.forEach(channel => {
          if (!(channel.id in context.state.selected)) {
            context.commit('UPDATE_SELECTION_STATE', {
              id: channel.id,
              selectionState: SelectionFlags.NONE,
            });
          }
        });

        return _loadClipboardNodes(context, clipboardNodes);
      })
      .then(() => {
        // Be sure to put these in after the channels!
        return context.dispatch('addClipboardNodes', {
          nodes: clipboardNodes,
          parent: clipboardRootId,
        });
      });
  });
}

export function loadClipboardNodes(context, { parent, ancestorId }) {
  const parentNode = context.state.clipboardNodesMap[parent];
  if (parentNode && parentNode.resource_count) {
    return Clipboard.where({ parent }).then(clipboardNodes => {
      if (!clipboardNodes.length) {
        return [];
      }

      return _loadClipboardNodes(context, clipboardNodes)
        .then(() => context.dispatch('addClipboardNodes', {
          nodes: clipboardNodes,
          parent,
          ancestorId,
        }));
    });
  } else if (!parentNode || !isLegacyNode(parentNode)) {
    // Has no child resources, and is either a new style clipboard node or not a clipboard node
    // so fetch children of associated contentnode instead if it has any
    const contentNode = context.getters.getClipboardNodeForRender(parent, ancestorId);
    if (contentNode && contentNode.has_children) {
      return context
        .dispatch('contentNode/loadContentNodes', { parent: contentNode.id }, { root: true })
        .then(nodes => context.dispatch('addClipboardNodes', { nodes, parent, ancestorId }))
        .then(() => []);
    }
  }
  return [];
}

export function addClipboardNodes(context, { nodes, parent, ancestorId = null }) {
  const parentSelection = context.state.selected[selectionId(parent, ancestorId)] || SelectionFlags.NONE;
  const selectionState = (parentSelection & SelectionFlags.ALL_DESCENDANTS)
    ? SelectionFlags.SELECTED | SelectionFlags.ALL_DESCENDANTS
    : SelectionFlags.NONE;

  nodes.forEach(node => {
    const sId = selectionId(node.id, ancestorId);
    if (!(sId in context.state.selected)) {
      context.commit('UPDATE_SELECTION_STATE', {
        id: node.id,
        ancestorId,
        selectionState,
      });
    }
  });

  context.commit('ADD_CLIPBOARD_NODES', nodes);
  return nodes;
}

let preloadPromise = Promise.resolve();
/**
 * Queues request to load the clipboard nodes, and returns a promise
 * when this particular set is loaded
 *
 * @param context
 * @param {{ parent: String, [ancestorId]: String|null }} payload
 * @return {Promise<Boolean>}
 */
export function preloadClipboardNodes(context, payload) {
  context.commit('ADD_PRELOAD_NODES', payload);
  preloadPromise = preloadPromise.then(() => {
    return context.dispatch('doPreloadClipboardNodes', payload);
  });
  return preloadPromise;
}

export function doPreloadClipboardNodes(context, payload) {
  const key = preloadKey(payload);
  if (key in context.state.preloadNodes) {
    return context
      .dispatch('cancelPreloadClipboardNodes', payload)
      .then(() => context.dispatch('loadClipboardNodes', payload))
      .then(() => new Promise(resolve => defer(resolve)))
      .then(() => true);
  }
  return false;
}

/**
 * @param context
 * @param {{ parent: String, ancestorId: String|null }} payload
 */
export function cancelPreloadClipboardNodes(context, payload) {
  context.commit('REMOVE_PRELOAD_NODES', payload);
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
  const channels = context.getters.channels;

  // Reducing the channels, going one by one processing colors, and collection an array
  // of all of them
  return channels.reduce((promise, channel) => {
    const src = channel.thumbnail_encoding['base64']
      ? channel.thumbnail_encoding['base64']
      : channel.thumbnail_url;

    // If we already have the color, just no src, then we'll just skip
    if (context.getters.getChannelColor(channel.id, null) !== null || !src) {
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
  }, Promise.resolve(Object.values(context.state.channelColors)));
}

/**
 * @param context
 * @param {string} node_id
 * @param {string} channel_id
 * @param {string|null} [target]
 * @param {boolean} [deep]
 * @param children
 * @return {*}
 */
export function copy(context, { node_id, channel_id, extra_fields = {} }) {
  const clipboardRootId = context.rootGetters['clipboardRootId'];
  extra_fields[ClipboardNodeFlag] = true;

  // This copies a "bare" copy, if you want a full content node copy,
  // go to the contentNode state actions
  return Clipboard.copy(node_id, channel_id, clipboardRootId, extra_fields).then(node => {
    context.commit('ADD_CLIPBOARD_NODES', [node]);
    // Refresh our channel list following the copy
    context.dispatch('loadChannels');
    return [node];
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
  return promiseChunk(sources, 20, sourcesChunk => {
    return Promise.all(sourcesChunk.map(source => context.dispatch('copy', source)));
  });
}

/**
 * Recursive function to set selection state for a node, and possibly it's ancestors and descendants
 */
export function setSelectionState(
  context,
  { id, selectionState, deep = true, parents = true, ancestorId = null }
) {
  const currentState = context.state.selected[selectionId(id, ancestorId)];

  // Well, we should only bother if it needs updating
  if (currentState !== selectionState) {
    context.commit('UPDATE_SELECTION_STATE', { id, selectionState, ancestorId });
  } else if (!deep && !parents) {
    return;
  }

  // Union for the ALL state (5)
  const ALL = SelectionFlags.SELECTED | SelectionFlags.ALL_DESCENDANTS;

  // Does this change cascade to the children? If so, and we're going `deep` then
  // cascade down what should happen
  if (deep && (!(selectionState & SelectionFlags.INDETERMINATE) || currentState > ALL)) {
    const clipboardTreeId = context.rootGetters['clipboardRootId'];
    const children =
      id === clipboardTreeId
        ? context.getters.channelIds
        : context.getters.getClipboardChildren(id, ancestorId).map(c => c.id);
    // Update descendants
    children.forEach(cid => {
      context.dispatch('setSelectionState', {
        id: cid,
        selectionState: selectionState === ALL ? ALL : SelectionFlags.NONE,
        parents: false,
        ancestorId: context.getters.isClipboardNode(cid)
          ? null
          : context.getters.isClipboardNode(id)
          ? id
          : ancestorId,
      });
    });
  }

  const parentId = context.getters.getClipboardParentId(id, ancestorId);

  if (parentId && parents) {
    // Updating the parents at this point is fairly easy, we just recurse upwards, recomputing
    // the new state for the parent
    const parentAncestorId = ancestorId === parentId ? null : ancestorId;
    context.dispatch('setSelectionState', {
      id: parentId,
      selectionState: context.getters.getSelectionState(parentId, parentAncestorId),
      deep: false,
      ancestorId: parentAncestorId,
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

export function deleteClipboardNode(context, { clipboardNodeId, ancestorId = null }) {
  if (context.getters.isClipboardNode(clipboardNodeId)) {
    return Clipboard.delete(clipboardNodeId).then(() => {
      context.commit('REMOVE_CLIPBOARD_NODE', { id: clipboardNodeId });
    });
  }
  const ancestor = context.state.clipboardNodesMap[ancestorId];

  const contentNode = context.rootGetters['contentNode/getContentNode'](clipboardNodeId);

  if (contentNode) {
    const excluded_descendants = {
      ...get(ancestor, ['extra_fields', 'excluded_descendants'], {}),
      [contentNode.node_id]: true,
    };
    const update = {
      extra_fields: {
        ...ancestor.extra_fields,
        excluded_descendants,
      },
    };
    // Otherwise we have a non clipboard node
    return Clipboard.update(ancestorId, update).then(() => {
      context.commit('ADD_CLIPBOARD_NODE', {
        ...ancestor,
        ...update,
      });
    });
  }
}

export function deleteClipboardNodes(context, selectionIds) {
  return Promise.all(
    selectionIds.map(selectionId => {
      return deleteClipboardNode(context, {
        clipboardNodeId: selectionId.split('-')[0],
        ancestorId: selectionId.split('-')[1],
      });
    })
  );
}

export function deleteLegacyNodes(context, ids) {
  return Clipboard.deleteLegacyNodes(ids);
}

export function moveClipboardNodes(context, { legacyTrees, newTrees, target }) {
  const promises = [];
  if (legacyTrees.length) {
    promises.push(
      context.dispatch(
        'contentNode/moveContentNodes',
        { id__in: legacyTrees.map(tree => tree.id), parent: target },
        { root: true }
      )
    );
  }
  if (newTrees.length) {
    for (let copyNode of newTrees) {
      promises.push(
        context.dispatch(
          'contentNode/copyContentNode',
          {
            id: copyNode.id,
            target,
            excluded_descendants: get(copyNode, ['extra_fields', 'excluded_descendants'], null),
          },
          { root: true }
        )
      );
    }
  }
  return Promise.all(promises).then(() => {
    const deletionPromises = [];
    if (newTrees.length) {
      deletionPromises.push(
        context.dispatch(
          'deleteClipboardNodes',
          newTrees.map(copyNode => copyNode.selectionId)
        )
      );
    }
    if (legacyTrees.length) {
      deletionPromises.push(
        context.dispatch(
          'deleteLegacyNodes',
          legacyTrees.map(tree => tree.id)
        )
      );
    }
    return Promise.all(deletionPromises);
  });
}

export function setPreviewNode(context, { id, ancestorId }) {
  context.commit('SET_PREVIEW_NODE', { id, ancestorId });
}

export function resetPreviewNode(context) {
  context.commit('SET_PREVIEW_NODE', { id: null, ancestorId: null });
}
