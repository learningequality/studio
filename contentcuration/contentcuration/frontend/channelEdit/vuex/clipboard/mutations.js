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
