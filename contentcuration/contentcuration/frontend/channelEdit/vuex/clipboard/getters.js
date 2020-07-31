import isFunction from 'lodash/isFunction';
import uniq from 'lodash/uniq';
import sortBy from 'lodash/sortBy';
import { SelectionFlags } from './constants';

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
  return rootGetters['contentNode/getTreeNodeChildren'](rootId);
}

export function getClipboardChildren(state, getters, rootState, rootGetters) {
  /**
   * Get the children of any "node" ID in the clipboard. This ID could
   * be a channel or the clipboard root
   *
   * @param {string} id
   */
  return function(id) {
    const rootId = rootGetters['clipboardRootId'];

    if (id === rootId) {
      return getters.channelIds.map(id => ({ id, channel_id: id }));
    }

    return getters.channelIds.includes(id)
      ? getters.clipboardChildren.filter(child => child.channel_id === id)
      : rootGetters['contentNode/getTreeNodeChildren'](id);
  };
}

export function getClipboardParentId(state, getters, rootState, rootGetters) {
  /**
   * Get the "parent" ID of the "node" in the clipboard. This ID could
   * be a channel or the clipboard root
   *
   * @param {string} id
   */
  return function(id) {
    const rootId = rootGetters['clipboardRootId'];

    if (id === rootId) {
      return null;
    }

    if (getters.channelIds.includes(id)) {
      return rootId;
    }

    const treeNode = rootGetters['contentNode/getTreeNode'](id);

    if (!treeNode) {
      return null;
    }

    return treeNode.parent === rootId ? treeNode.channel_id : treeNode.parent;
  };
}

/**
 * List of distinct source channel ID's containing a node on the clipboard
 */
export function channelIds(state, getters) {
  return uniq(getters.clipboardChildren.map(n => n.channel_id)).filter(Boolean);
}

/**
 * List of distinct source channel containing a node on the clipboard
 */
export function channels(state, getters, rootState, rootGetters) {
  return getters.channelIds.map(id => rootGetters['channel/getChannel'](id));
}

export function filterSelectionIds(state) {
  /**
   * Filters the selection states by a flag|state
   *
   * @param {Number|Function} filter
   */
  return function(filter) {
    const filterFunc = isFunction(filter)
      ? filter
      : (id, selectionState) => Boolean(selectionState & filter);

    return Object.entries(state.selected)
      .map(([id, selectionState]) => (filterFunc(id, selectionState) ? id : null))
      .filter(Boolean);
  };
}

/**
 * List of the selected tree nodes on the clipboard
 */
export function selectedNodes(state, getters, rootState, rootGetters) {
  return getters
    .filterSelectionIds(SelectionFlags.SELECTED)
    .map(id => rootGetters['contentNode/getTreeNode'](id))
    .filter(Boolean);
}

/**
 * List of channels containing a selected node on the clipboard
 */
export function selectedChannels(state, getters, rootState, rootGetters) {
  return getters.selectedNodes
    .map(node => node.channel_id)
    .filter(Boolean)
    .reduce((channelIds, channelId) => {
      if (!channelIds.includes(channelId)) {
        channelIds.push(channelId);
      }

      return channelIds;
    }, [])
    .map(channelId => rootGetters['channel/getChannel'](channelId));
}

export function getChannelColor(state) {
  /**
   * The visual color cue for the channel, determined from the thumbnail
   *
   * @param {string} channelId
   */
  return function(channelId) {
    return channelId in state.channelColors ? state.channelColors[channelId] : null;
  };
}

export function currentSelectionState(state) {
  /**
   * The current selection state for a node as it is in the state
   *
   * @param {string} id
   */
  return function(id) {
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
  return function(id) {
    const rootId = rootGetters['clipboardRootId'];

    // Start with simply just 0 or 1, selection state
    let selectionState = state.selected[id] & SelectionFlags.SELECTED;

    // Compute the children state, if any
    const childrenState = getters.getSelectionStateFromIds(
      getters.getClipboardChildren(id).map(c => c.id)
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
  return function(ids) {
    const states = ids.map(id => getters.getSelectionState(id));

    if (!ids.length) {
      // undefined state
      return null;
    }

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
  return function(id) {
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

export function getCopyTrees(state, getters) {
  /**
   * Creates an array of "trees" of copy call arguments from the current selection
   *
   * @param {string} target
   * @return {[{ id: Number, deep: Boolean, target: string, children: [] }]}
   */
  return function(target) {
    const selectedNodes = getters.selectedNodes;

    if (!selectedNodes.length) {
      return [];
    }

    // Ensure we go down in tree order
    const updates = sortBy(selectedNodes, 'lft').reduce((updates, selectedNode) => {
      const selectionState = getters.currentSelectionState(selectedNode.id);
      const update = {
        id: selectedNode.source_id,
        target,
        deep: Boolean(selectionState & SelectionFlags.ALL_DESCENDANTS),
        children: [],
        ignore: false,
      };

      if (selectedNode.parent in updates) {
        const parentUpdate = updates[selectedNode.parent];

        if (!parentUpdate.deep) {
          // Target will be set after parent is copied
          update.target = null;
          parentUpdate.children.push(update);
        }

        // We'll mark to ignore which doesn't affect the update appended to the children above
        update.ignore = true;
      }

      updates[selectedNode.id] = update;
      return updates;
    }, {});

    return Object.values(updates).filter(update => !update.ignore);
  };
}
