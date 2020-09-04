import Vue from 'vue';

export function ADD_CHANNEL(state, channel) {
  Vue.set(state.channelMap, channel.id, channel);
}

export function ADD_CHANNEL_COLOR(state, { id, color }) {
  Vue.set(state.channelColors, id, color);
}

export function UPDATE_SELECTION_STATE(state, { id, selectionState }) {
  Vue.set(state.selected, id, selectionState);
}

export function ADD_CLIPBOARD_NODE(state, clipboardNode) {
  Vue.set(state.clipboardNodesMap, clipboardNode.id, clipboardNode);
}

export function ADD_CLIPBOARD_NODES(state, clipboardNodes) {
  for (let clipboardNode of clipboardNodes) {
    ADD_CLIPBOARD_NODE(state, clipboardNode);
  }
}

export function REMOVE_CLIPBOARD_NODE(state, clipboardNode) {
  Vue.delete(state.clipboardNodesMap, clipboardNode.id);
}
