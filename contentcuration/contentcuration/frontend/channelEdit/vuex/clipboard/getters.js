import flatten from 'lodash/flatten';
import get from 'lodash/get';
import isFunction from 'lodash/isFunction';
import uniq from 'lodash/uniq';
import sortBy from 'lodash/sortBy';
import { ClipboardNodeFlag, SelectionFlags } from './constants';
import { selectionId, idFromSelectionId, isLegacyNode } from './utils';

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
  return function(id) {
    const node = getters.getClipboardNodeForRender(id);
    return node && node.total_count > 0;
  };
}

export function isClipboardNode(state) {
  return function(id) {
    return Boolean(state.clipboardNodesMap[id]);
  };
}

// Special getter for seeing if a node was created before
// we copied to the clipboard by reference.
export function legacyNode(state) {
  return function(id) {
    return !get(state.clipboardNodesMap, [id, 'extra_fields', ClipboardNodeFlag]);
  };
}

export function legacyNodesSelected(state, getters) {
  return getters.selectedNodeIds.find(selectionId =>
    getters.legacyNode(idFromSelectionId(selectionId))
  );
}

export function getClipboardChildren(state, getters, rootState, rootGetters) {
  /**
   * Get the children of any "node" ID in the clipboard. This ID could
   * be a channel or the clipboard root
   *
   * @param {string} id
   */
  return function(id, ancestorId = null) {
    const rootId = rootGetters['clipboardRootId'];

    if (id === rootId) {
      return getters.channelIds.map(id => ({ id, channel_id: id }));
    }

    if (getters.channelIds.includes(id)) {
      // This is a channel level node, so return the channels
      return sortBy(
        getters.clipboardChildren.filter(child => child.source_channel_id === id),
        'lft'
      );
    }
    if (state.clipboardNodesMap[id] && state.clipboardNodesMap[id].total_count) {
      // We have a clipboard node that has children return its children directly
      return sortBy(
        Object.values(state.clipboardNodesMap).filter(c => c.parent === id),
        'lft'
      );
    }
    const contentNode = getters.getClipboardNodeForRender(id);
    if (contentNode && contentNode.total_count) {
      // Last clipboard node ancestor could either be further up the chain or this node
      const ancestor = state.clipboardNodesMap[ancestorId] || state.clipboardNodesMap[id];
      const children = rootGetters['contentNode/getContentNodeChildren'](contentNode.id);
      if (ancestor) {
        return children.filter(
          c => !get(ancestor, ['extra_fields', 'excluded_descendants', c.node_id], false)
        );
      }
      return children;
    }
    return [];
  };
}

export function getClipboardParentId(state, getters, rootState, rootGetters) {
  /**
   * Get the "parent" ID of the "node" in the clipboard. This ID could
   * be a channel or the clipboard root
   *
   * @param {string} id
   */
  return function(id, ancestorId = null) {
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

    const contentNode = rootGetters['contentNode/getContentNode'](id);

    if (!contentNode) {
      return null;
    }

    // Check if this contentNode is an immediate child of the clipboard ancestor
    if (getters.getClipboardChildren(ancestorId).find(c => c.id === id)) {
      return ancestorId;
    }

    // Otherwise, this is a contentNode that is somewhere further down the tree, so just return
    // its parent
    return contentNode.parent;
  };
}

export function getClipboardNodeForRender(state, getters, rootState, rootGetters) {
  /**
   * Get a ContentNode for the clipboard based on the clipboard node id
   * this then will look up the content node matching that node_id and channel_id
   *
   * @param {string} id
   */
  return function(id) {
    const rootId = rootGetters['clipboardRootId'];

    if (id === rootId) {
      // Don't need to fetch a contentnode for the root id
      return null;
    }

    const clipboardNode = state.clipboardNodesMap[id];

    if (!clipboardNode || isLegacyNode(clipboardNode)) {
      // No record of this node locally
      // or it's a legacy node
      // either way try to return the full contentnode representation
      // for this id
      const contentNode = rootGetters['contentNode/getContentNode'](id);

      if (contentNode) {
        return contentNode;
      }
      return null;
    }

    // First try to look up by source_node_id and source_channel_id
    const sourceNode = Object.values(rootState.contentNode.contentNodesMap).find(
      node =>
        node.node_id === clipboardNode.source_node_id &&
        node.channel_id === clipboardNode.source_channel_id
    );

    if (sourceNode) {
      const contentNode = rootGetters['contentNode/getContentNode'](sourceNode.id);
      return {
        ...contentNode,
        resource_count: clipboardNode.resource_count || contentNode.resource_count,
        total_count: clipboardNode.total_count || contentNode.total_count,
      };
    }

    return null;
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
export function selectedNodeIds(state, getters) {
  return getters.filterSelectionIds(SelectionFlags.SELECTED);
}

/**
 * List of channels containing a selected node on the clipboard
 */
export function selectedChannels(state, getters, rootState, rootGetters) {
  return uniq(
    getters
      .filterSelectionIds(SelectionFlags.SELECTED)
      // eslint-disable-next-line no-unused-vars
      .map(selectionId => {
        const nodeId = idFromSelectionId(selectionId);
        const node = getters.getClipboardNodeForRender(nodeId);
        if (node) {
          return node.channel_id;
        }
      })
  )
    .filter(Boolean)
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
  return function(id, ancestorId = null) {
    const rootId = rootGetters['clipboardRootId'];

    // Start with simply just 0 or 1, selection state
    let selectionState = state.selected[selectionId(id, ancestorId)] & SelectionFlags.SELECTED;

    // Compute the children state, if any
    const children = getters.getClipboardChildren(id, ancestorId);
    // Calculate the ancestor Id of the children, if they are clipboard nodes,
    // then they have none, otherwise, either any passed in ancestorId or the id of this node
    const childAncestorId =
      children.length && getters.isClipboardNode(children[0].id)
        ? null
        : getters.isClipboardNode(id)
        ? id
        : ancestorId;
    const childrenState = getters.getSelectionStateFromIds(
      children.map(c => c.id),
      childAncestorId
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
  return function(ids, ancestorId = null) {
    if (!ids.length) {
      // undefined state
      return null;
    }

    const states = ids.map(id => getters.getSelectionState(id, ancestorId));

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
  return function(id, ancestorId = null) {
    // Compute the current state
    const current = getters.getSelectionState(id, ancestorId);

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
  return function(rootId, ancestorId = null, ignoreSelection = false) {
    function recurseForUnselectedIds(id, ancestorId) {
      const selectionState = getters.getSelectionState(id, ancestorId);
      // Nothing is selected, so return early.
      if (selectionState === SelectionFlags.NONE) {
        const contentNode = getters.getClipboardNodeForRender(id);
        return [contentNode.node_id];
      }
      return flatten(
        getters
          .getClipboardChildren(id, ancestorId)
          .map(c => recurseForUnselectedIds(c.id, ancestorId))
      );
    }

    function recurseforCopy(id, ancestorId = null) {
      const selectionState = getters.getSelectionState(id, ancestorId);
      // Nothing is selected, so return early.
      if (selectionState === SelectionFlags.NONE && !ignoreSelection) {
        return [];
      }
      const children = getters.getClipboardChildren(id, ancestorId);
      // Calculate the ancestor Id of the children, if they are clipboard nodes,
      // then they have none, otherwise, either any passed in ancestorId or the id of this node
      const childrenAreClipboardNodes = children.length && getters.isClipboardNode(children[0].id);
      const childAncestorId = childrenAreClipboardNodes
        ? null
        : getters.isClipboardNode(id)
        ? id
        : ancestorId;
      if (selectionState & SelectionFlags.SELECTED || ignoreSelection) {
        // Node itself is selected, so this can be a starting point in a tree node
        const sourceClipboardNode = state.clipboardNodesMap[id];
        const selectedNode = getters.getClipboardNodeForRender(id);
        const legacy = isLegacyNode(sourceClipboardNode);
        const update = {
          node_id: selectedNode.node_id,
          channel_id: selectedNode.channel_id,
          id: selectedNode.id,
          selectionId: selectionId(id, ancestorId),
          legacy,
        };
        if (children.length) {
          // We have copied the parent as a clipboard node, and the children are content nodes
          // can now switch mode to just return a mask of unselected node_ids
          const excluded_descendants = {};
          if (sourceClipboardNode && !legacy) {
            for (let key in get(
              sourceClipboardNode,
              ['extra_fields', 'excluded_descendants'],
              {}
            )) {
              excluded_descendants[key] = true;
            }
          }
          if (!(selectionState & SelectionFlags.ALL_DESCENDANTS) && !ignoreSelection) {
            // Some of the children are not selected, so get the node_ids that aren't selected
            for (let child of children) {
              for (let key of recurseForUnselectedIds(child.id, childAncestorId)) {
                excluded_descendants[key] = true;
              }
            }
          }
          update.extra_fields = {
            excluded_descendants,
          };
        }
        return [update];
      }
      return flatten(children.map(c => recurseforCopy(c.id, childAncestorId))).filter(Boolean);
    }

    return recurseforCopy(rootId, ancestorId);
  };
}
