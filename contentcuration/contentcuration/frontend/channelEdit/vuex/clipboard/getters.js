import flatten from 'lodash/flatten';
import get from 'lodash/get';
import isFunction from 'lodash/isFunction';
import partition from 'lodash/partition';
import uniq from 'lodash/uniq';
import sortBy from 'lodash/sortBy';
import { findNode } from '../contentNode/utils';
import { SelectionFlags, LoadStatus } from './constants';
import { isLegacyNode as legacyNode } from './utils';

/**
 * Several of these handle the clipboard root and channel ID's because we're
 * coordinating the differences between the data model and the visual representation
 * of the clipboard.
 *
 * Clipboard root (a "node")
 *   > Channel (a "node")
 *     > Node
 *     > Node
 *     > Topic (a "node")
 *       > Node
 * ...
 */

/**
 * Get the immediate children of the clipboard root
 */
export function clipboardChildren(state, getters, rootState, rootGetters) {
  const rootId = rootGetters['clipboardRootId'];
  return Object.values(state.clipboardNodesMap).filter(c => c.parent === rootId);
}

export function hasClipboardChildren(state, getters) {
  return function (id) {
    return Boolean(getters.getClipboardChildren(id).length);
  };
}

/*
 * Special getter for seeing if a node was created before
 * we copied to the clipboard by reference.
 */
export function isLegacyNode(state, getters, rootState, rootGetters) {
  return function (id) {
    const rootId = rootGetters['clipboardRootId'];
    const node = state.clipboardNodesMap[id];
    return id !== rootId && node && legacyNode(node);
  };
}

export function isClipboardNode(state, getters) {
  return function (id) {
    return !getters.isLegacyNode(id);
  };
}

export function legacyNodesSelected(state, getters) {
  const { selectedNodeIds } = getters;
  return Boolean(selectedNodeIds.find(id => getters.isLegacyNode(id)));
}

export function getClipboardAncestorNode(state, getters, rootState, rootGetters) {
  return function (id) {
    const rootId = rootGetters['clipboardRootId'];
    if (id === rootId || getters.channelIds.includes(id)) {
      return null;
    }

    const clipboardNode = state.clipboardNodesMap[id];
    if (clipboardNode) {
      return clipboardNode.parent === rootId
        ? clipboardNode
        : getters.getClipboardAncestorNode(clipboardNode.parent);
    }
    return null;
  };
}

export function getClipboardChildren(state, getters, rootState, rootGetters) {
  /**
   * Get the children of any "node" ID in the clipboard. This ID could
   * be a channel, the clipboard root, or content node in the clipboard
   *
   * @param {string} id
   */
  return function (id) {
    const rootId = rootGetters['clipboardRootId'];

    if (id === rootId) {
      return getters.channelIds.map(id => ({ id, channel_id: id, parent: rootId }));
    }

    // This is a channel level node, so return the nodes from that channel
    if (getters.channelIds.includes(id)) {
      return sortBy(
        getters.clipboardChildren.filter(child => child.source_channel_id === id),
        'lft',
      );
    }

    return sortBy(
      Object.values(state.clipboardNodesMap).filter(c => c.parent === id),
      'lft',
    );
  };
}

export function getClipboardParentId(state, getters, rootState, rootGetters) {
  /**
   * Get the "parent" ID of the "node" in the clipboard. This ID could
   * be a channel or the clipboard root
   *
   * @param {string} id
   */
  return function (id) {
    const rootId = rootGetters['clipboardRootId'];

    if (id === rootId) {
      return null;
    }

    if (getters.channelIds.includes(id)) {
      return rootId;
    }

    const clipboardNode = state.clipboardNodesMap[id];

    if (clipboardNode) {
      return clipboardNode.parent === rootId
        ? clipboardNode.source_channel_id
        : clipboardNode.parent;
    }

    return null;
  };
}

export function getContentNodeForRender(state, getters, rootState, rootGetters) {
  /**
   * Get a ContentNode for the clipboard based on the clipboard node id
   * this then will look up the content node matching that node_id and channel_id
   *
   * @param {string} id
   */
  return function (id) {
    const rootId = rootGetters['clipboardRootId'];

    // Don't need to fetch a contentnode for the root or channels
    if (id === rootId || getters.channelIds.includes(id)) {
      return null;
    }

    if (getters.isLegacyNode(id)) {
      return rootState.contentNode.contentNodesMap[id];
    }

    const clipboardNode = state.clipboardNodesMap[id];
    if (!clipboardNode) {
      return null;
    }

    // First try to look up by source_node_id and source_channel_id
    return findNode(rootState.contentNode.contentNodesMap, {
      node_id: clipboardNode.source_node_id,
      channel_id: clipboardNode.source_channel_id,
    });
  };
}

/**
 * List of distinct source channel ID's containing a node on the clipboard
 */
export function channelIds(state, getters) {
  return uniq(getters.clipboardChildren.map(n => n.source_channel_id)).filter(Boolean);
}

/**
 * List of distinct source channel containing a node on the clipboard
 */
export function channels(state, getters, rootState, rootGetters) {
  return getters.channelIds.map(id => rootGetters['channel/getChannel'](id)).filter(Boolean);
}

export function filterSelectionIds(state) {
  /**
   * Filters the selection states by a flag|state
   *
   * @param {Number|Function} filter
   */
  return function (filter) {
    const filterFunc = isFunction(filter)
      ? filter
      : (id, selectionState) => Boolean(selectionState & filter);

    return Object.entries(state.selected)
      .filter(
        ([id, selectionState]) => state.clipboardNodesMap[id] && filterFunc(id, selectionState),
      )
      .map(([id]) => id);
  };
}

/**
 * List of the selected tree nodes on the clipboard
 */
export function selectedNodeIds(state, getters) {
  return getters.filterSelectionIds(SelectionFlags.SELECTED);
}

export function getChannelColor(state) {
  /**
   * The visual color cue for the channel, determined from the thumbnail
   *
   * @param {string} channelId
   */
  return function (channelId) {
    return state.channelColors[channelId];
  };
}

export function currentSelectionState(state) {
  /**
   * The current selection state for a node as it is in the state
   *
   * @param {string} id
   */
  return function (id) {
    return state.selected[id];
  };
}

export function getSelectionState(state, getters, rootState, rootGetters) {
  /**
   * Get the current computed state of the node. The state is a bitmask of the
   * selection flags
   *
   * When thinking about this state, think of this as providing solely what you
   * need to know about in order to render the checkbox for that clipboard item.
   *
   * 1) If the node is not a topic node, the only flag we care about is the SELECTED flag.
   * 2) If the node is a topic node, we need to know:
   *   a) if the node itself is selected, which again is the SELECTED flag,
   *   b) whether there exists a selected descendant node, represented by INDETERMINATE, and
   *   c) whether all the descendants are selected through ALL_DESCENDANTS.
   *
   * Where the selection flags are:
   *
   *   NONE = 0
   *   SELECTED = 1
   *   INDETERMINATE = 2
   *   ALL_DESCENDANTS = 4
   *
   * Using bit operations, we can reveal the states:
   *
   *   State 1 = 1 = SELECTED
   *     e.g. [X] Node State 1
   *   State 2 = 2 = INDETERMINATE
   *     e.g. [-] Channel State 2 -> { [ ] Node A, [X] Node B }
   *   State 3 = 1 & 2 = SELECTED & INDETERMINATE
   *     e.g. [X] Topic State 3 -> { [ ] Node A, [X] Node B }
   *   State 4 = 4 = ALL_DESCENDANTS
   *     e.g. [X] Channel State 4
   *   State 5 = 1 & 4 = SELECTED & ALL_DESCENDANTS
   *     e.g. [X] Topic State 5 -> { [ ] Node A, [X] Node B }
   *   State 6 = 2 & 4 = INDETERMINATE & ALL_DESCENDANTS
   *     e.g. [ ] Topic State 6 -> { [X] Node A, [X] Node B }
   *
   * @param {string} id
   */
  return function (id) {
    const rootId = rootGetters['clipboardRootId'];

    // Start with simply just 0 or 1, selection state
    let selectionState = state.selected[id] & SelectionFlags.SELECTED;

    // Compute the children state, if any
    const childrenState = getters.getSelectionStateFromIds(
      getters.getClipboardChildren(id).map(c => c.id),
    );

    // No children state, we're done
    if (childrenState === null) {
      return selectionState;
    }

    // The conditions require us to flip on indeterminate because
    // the children state has selected nodes in some form
    // The root and channels should not have this done
    if (
      selectionState === SelectionFlags.NONE &&
      childrenState !== SelectionFlags.NONE &&
      id !== rootId &&
      !getters.channelIds.includes(id)
    ) {
      selectionState |= SelectionFlags.INDETERMINATE;
    } else {
      // Union it with the children state
      selectionState |= childrenState;
    }

    return selectionState;
  };
}

export function getSelectionStateFromIds(state, getters) {
  /**
   * Compute the state for a parent from it's children, to be OR'ed
   * with the parent's state
   *
   * @param {string[]} ids
   */
  return function (ids) {
    if (!ids.length) {
      // undefined state
      return null;
    }

    const states = ids.map(id => getters.getSelectionState(id));

    // If all states are none, then none
    if (!states.find(s => s > SelectionFlags.NONE)) {
      return SelectionFlags.NONE;
    }

    const index = states.findIndex(selectionState => {
      // If we have one unselected or one indeterminate, respond indeterminate
      return !selectionState || selectionState & SelectionFlags.INDETERMINATE;
    });

    // Lastly if it wasn't none nor indeterminate, then it's all descendants
    return index >= 0 ? SelectionFlags.INDETERMINATE : SelectionFlags.ALL_DESCENDANTS;
  };
}

/**
 * Flags | Binary
 *
 * 0 > 5 | 000 > 101
 * 1 > 0 | 100 > 000
 * 2 > 3 | 010 > 110
 * 3 > 5 | 110 > 101
 * 4 > 3 | 001 > 110
 * 5 > 6 | 101 > 011
 * 6 > 0 | 011 > 000
 * 7 > 0 | 111 > 000 -- undefined state
 */
export function getNextSelectionState(state, getters) {
  /**
   * Gets the next selection state. The state transitions follow the pattern above
   *
   * @param {string} id
   */
  return function (id) {
    // Compute the current state
    const current = getters.getSelectionState(id);

    // Carefully determine each bit/piece of the state
    // Be sure to cast to bool because if we compare ===, we want true/false values
    const isSelected = Boolean(current & SelectionFlags.SELECTED);
    const isIndeterminate = Boolean(current & SelectionFlags.INDETERMINATE);
    const isAllDescendants = Boolean(current & SelectionFlags.ALL_DESCENDANTS);

    let nextState = current;

    // Following the table, above, these conditions flip selection
    if (!isIndeterminate || isSelected === isAllDescendants) {
      nextState ^= SelectionFlags.SELECTED;
    }

    // This condition flips indeterminate
    if (current > SelectionFlags.INDETERMINATE) {
      nextState ^= SelectionFlags.INDETERMINATE;
    }

    // This condition flips all descendants
    if (isIndeterminate === isSelected || (isIndeterminate && isAllDescendants)) {
      nextState ^= SelectionFlags.ALL_DESCENDANTS;
    }

    return nextState;
  };
}

export function getCopyTrees(state, getters, rootState, rootGetters) {
  /**
   * Creates an array of "trees" of copy call arguments from the current selection
   *
   * @param {string} id
   * @param {Boolean} [ignoreSelection]
   * @return {[{ id: Number, deep: Boolean, target: string, children: [] }]}
   */
  return function (id, ignoreSelection = false) {
    function recurseForUnselectedIds(id) {
      const selectionState = getters.currentSelectionState(id);
      // Nothing is selected, so return early.
      if (!(selectionState & SelectionFlags.SELECTED)) {
        const contentNode = getters.getContentNodeForRender(id);
        return [contentNode.node_id];
      }
      return flatten(getters.getClipboardChildren(id).map(c => recurseForUnselectedIds(c.id)));
    }

    // Nothing is selected, so return early.
    const selectionState = getters.currentSelectionState(id);
    if (selectionState === SelectionFlags.NONE && !ignoreSelection) {
      return [];
    }

    // We don't care about a selection state of the clipboard root or a channel,
    // except when it's selected and if they have children
    const children = getters.getClipboardChildren(id);
    if (
      id === rootGetters['clipboardRootId'] ||
      getters.channelIds.includes(id) ||
      (!(selectionState & SelectionFlags.SELECTED) && !ignoreSelection)
    ) {
      return flatten(children.map(c => getters.getCopyTrees(c.id, ignoreSelection))).filter(
        Boolean,
      );
    }

    // Node itself is selected, so this can be a starting point in a tree node
    const clipboardNode = state.clipboardNodesMap[id];
    const selectedNode = getters.getContentNodeForRender(id);
    const legacy = getters.isLegacyNode(id);
    const update = {
      id: selectedNode.id,
      node_id: selectedNode.node_id,
      channel_id: selectedNode.channel_id,
      legacy,
      clipboardNodeId: clipboardNode.id,
      // Be sure to carryover the original node's excluded descendants
      extra_fields: {
        excluded_descendants: get(clipboardNode, ['extra_fields', 'excluded_descendants'], {}),
      },
    };

    if (children.length === 0 || selectionState & SelectionFlags.ALL_DESCENDANTS) {
      return [update];
    }

    // We have copied the parent as a clipboard node, and the children are content nodes
    // can now switch mode to just return a mask of unselected node_ids
    if (!(selectionState & SelectionFlags.ALL_DESCENDANTS) && !ignoreSelection) {
      // Some of the children are not selected, so get the node_ids that aren't selected
      for (const child of children) {
        for (const key of recurseForUnselectedIds(child.id)) {
          update.extra_fields.excluded_descendants[key] = true;
        }
      }
    }
    return [update];
  };
}

export function getMoveTrees(state, getters) {
  return function (rootId, ignoreSelection = false) {
    const trees = getters.getCopyTrees(rootId, ignoreSelection);

    const [legacyTrees, newTrees] = partition(trees, t => t.legacy);
    return {
      legacyTrees,
      newTrees,
    };
  };
}

export function previewSourceNode(state, getters) {
  if (!state.previewNode) {
    return null;
  }

  return getters.getContentNodeForRender(state.previewNode);
}

export function isPreloading(state) {
  return function (parent) {
    return parent in state.preloadNodes && state.preloadNodes[parent] !== LoadStatus.LOADED;
  };
}

export function isLoaded(state) {
  return function (parent) {
    return parent in state.preloadNodes && state.preloadNodes[parent] === LoadStatus.LOADED;
  };
}
