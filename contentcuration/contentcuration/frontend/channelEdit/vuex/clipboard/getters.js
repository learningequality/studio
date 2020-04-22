import uniq from 'lodash/uniq';
import { SelectionFlags } from './constants';

export function clipboardChildren(state, getters, rootState, rootGetters) {
  const rootId = rootGetters['clipboardRootId'];
  return rootGetters['contentNode/getTreeNodeChildren'](rootId);
}

export function getClipboardChildren(state, getters, rootState, rootGetters) {
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

export function channelIds(state, getters) {
  return uniq(getters.clipboardChildren.map(n => n.channel_id));
}

export function channels(state, getters, rootState, rootGetters) {
  return getters.channelIds.map(id => rootGetters['channel/getChannel'](id));
}

export function selectedNodes(state, getters, rootState, rootGetters) {
  return Object.entries(state.selected)
    .map(([id, value]) => {
      if (value & SelectionFlags.SELECTED) {
        return rootGetters['contentNode/getTreeNode'](id);
      }
      return null;
    })
    .filter(Boolean);
}

export function selectedChannels(state, getters, rootState, rootGetters) {
  return getters.selectedNodes
    .map(node => node.channel_id)
    .reduce((channelIds, channelId) => {
      if (!channelIds.includes(channelId)) {
        channelIds.push(channelId);
      }

      return channelIds;
    }, [])
    .map(channelId => rootGetters['channel/getChannel'](channelId));
}

export function getChannelColor(state) {
  return function(channelId, defaultValue = '#6c939b') {
    return channelId in state.channelColors ? state.channelColors[channelId] : defaultValue;
  };
}

export function currentSelectionState(state) {
  return function(id) {
    return state.selected[id];
  };
}

export function getSelectionState(state, getters, rootState, rootGetters) {
  return function(id) {
    const rootId = rootGetters['clipboardRootId'];
    let selectionState = state.selected[id] & SelectionFlags.SELECTED;

    const childrenState = getters.getSelectionStateFromIds(
      getters.getClipboardChildren(id).map(c => c.id)
    );

    if (childrenState === null) {
      return selectionState;
    }

    if (
      selectionState === SelectionFlags.NONE &&
      childrenState !== SelectionFlags.NONE &&
      id !== rootId &&
      !getters.channelIds.includes(id)
    ) {
      selectionState |= SelectionFlags.INDETERMINATE;
    } else {
      selectionState |= childrenState;
    }

    return selectionState;
  };
}

export function getSelectionStateFromIds(state, getters) {
  return function(ids) {
    const states = ids.map(id => getters.getSelectionState(id));

    if (!ids.length) {
      // undefined state
      return null;
    }

    if (!states.find(s => s > SelectionFlags.NONE)) {
      return SelectionFlags.NONE;
    }

    const index = states.findIndex(selectionState => {
      // If we have one unselected or one indeterminate, respond indeterminate
      return !selectionState || selectionState & SelectionFlags.INDETERMINATE;
    });

    return index >= 0 ? SelectionFlags.INDETERMINATE : SelectionFlags.ALL_DESCENDANTS;
  };
}

/**
 * Flags | Binary
 *
 * 1 > 0 | 100 > 000
 * 2 > 3 | 010 > 110
 * 5 > 6 | 101 > 011
 *
 * 0 > 5 | 000 > 101
 * 4 > 3 | 001 > 110
 * 7 > 0 | 111 > 000 -- undefined state
 * 3 > 5 | 110 > 101
 * 6 > 0 | 011 > 000
 */
export function getNextSelectionState(state, getters) {
  return function(id) {
    const current = getters.getSelectionState(id);
    const isSelected = Boolean(current & SelectionFlags.SELECTED);
    const isIndeterminate = Boolean(current & SelectionFlags.INDETERMINATE);
    const isAllDescendants = Boolean(current & SelectionFlags.ALL_DESCENDANTS);

    let nextState = current;

    if (!isIndeterminate || isSelected === isAllDescendants) {
      nextState ^= SelectionFlags.SELECTED;
    }

    if (current > SelectionFlags.INDETERMINATE) {
      nextState ^= SelectionFlags.INDETERMINATE;
    }

    if (isIndeterminate === isSelected || (isIndeterminate && isAllDescendants)) {
      nextState ^= SelectionFlags.ALL_DESCENDANTS;
    }

    return nextState;
  };
}

/**
 * Flags | Binary
 *
 * 1 > 0 | 100 > 000
 * 2 > 3 | 010 > 110
 * 4 > 3 | 001 > 110
 * 5 > 6 | 101 > 011
 *
 *
 * 0 > 5 | 000 > 101
 * 3 > 0 | 110 > 000
 * 6 > 3 | 011 > 110
 */
export function getNextChildSelectionState(state) {
  return function(id, parentState) {
    const childState = state.selected[id];

    if (
      !(parentState & SelectionFlags.INDETERMINATE) ||
      parentState === SelectionFlags.INDETERMINATE
    ) {
      // no-op
      return childState;
    }

    const ALL = SelectionFlags.SELECTED | SelectionFlags.ALL_DESCENDANTS;
    return parentState === ALL ? ALL : SelectionFlags.NONE;
  };
}
