// eslint-disable-next-line import/no-named-as-default
import Vue, { set } from 'vue';

export function SET_INITIALIZING(state, isInitializing) {
  state.initializing = isInitializing;
}

export function ADD_CHANNEL_COLOR(state, { id, color }) {
  set(state.channelColors, id, color);
}

export function UPDATE_SELECTION_STATE(state, { id, selectionState } = {}) {
  set(state.selected, id, selectionState);
}

export function ADD_CLIPBOARD_NODE(state, clipboardNode) {
  set(state.clipboardNodesMap, clipboardNode.id, clipboardNode);
}

export function ADD_CLIPBOARD_NODES(state, clipboardNodes) {
  for (const clipboardNode of clipboardNodes) {
    ADD_CLIPBOARD_NODE(state, clipboardNode);
  }
}

export function REMOVE_CLIPBOARD_NODE(state, clipboardNode) {
  Vue.delete(state.clipboardNodesMap, clipboardNode.id);
}

export function SET_PREVIEW_NODE(state, id) {
  state.previewNode = id;
}

export function SET_PRELOAD_NODES(state, preloadNodes) {
  for (const parent in preloadNodes) {
    set(state.preloadNodes, parent, preloadNodes[parent]);
  }
}

export function REMOVE_PRELOAD_NODES(state, parent) {
  Vue.delete(state.preloadNodes, parent);
}

export function RESET_PRELOAD_NODES(state) {
  for (const key in state.preloadNodes) {
    Vue.delete(state.preloadNodes, key);
  }
}
