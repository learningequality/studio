import Vue from 'vue';
import pick from 'lodash/pick';
import { ContentDefaults } from 'shared/constants';
import { mergeMapItem } from 'shared/vuex/utils';

/* CHANNEL LIST MUTATIONS */

export function ADD_CHANNEL(state, channel) {
  state.channelsMap = mergeMapItem(state.channelsMap, channel);
}

export function ADD_CHANNELS(state, channels = []) {
  state.channelsMap = channels.reduce((channelsMap, channel) => {
    return mergeMapItem(channelsMap, channel);
  }, state.channelsMap);
}

export function REMOVE_CHANNEL(state, channel) {
  Vue.delete(state.channelsMap, channel.id);
}

export function UPDATE_CHANNEL(state, { id, content_defaults = {}, ...payload } = {}) {
  if (!id) {
    throw ReferenceError('id must be defined to update a channel');
  }
  const channel = state.channelsMap[id];
  if (channel) {
    state.channelsMap[id] = {
      ...channel,
      ...payload,
      // Assign all acceptable content defaults into the channel defaults
      content_defaults: Object.assign(
        channel.content_defaults || {},
        pick(content_defaults, Object.keys(ContentDefaults))
      ),
    };
  }
}

export function SET_BOOKMARK(state, { id, bookmark }) {
  state.channelsMap[id].bookmark = bookmark;
}
