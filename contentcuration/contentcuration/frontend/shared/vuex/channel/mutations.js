import Vue from 'vue';
import pick from 'lodash/pick';
import { ContentDefaults } from 'shared/constants';
import { mergeMapItem } from 'shared/vuex/utils';

/* CHANNEL LIST MUTATIONS */

export function ADD_CHANNEL(state, channel) {
  if (!channel.id) {
    throw ReferenceError('id must be defined to update a channel');
  }
  Vue.set(
    state.channelsMap,
    channel.id,
    Object.assign({}, state.channelsMap[channel.id] || {}, channel)
  );
}

export function ADD_CHANNELS(state, channels = []) {
  channels.forEach(channel => {
    ADD_CHANNEL(state, channel);
  });
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
    Vue.set(state.channelsMap, id, {
      ...channel,
      ...payload,
      // Assign all acceptable content defaults into the channel defaults
      content_defaults: Object.assign(
        {},
        channel.content_defaults || {},
        pick(content_defaults, Object.keys(ContentDefaults))
      ),
    });
  }
}

export function SET_BOOKMARK(state, { id, bookmark }) {
  state.channelsMap[id].bookmark = bookmark;
}

export function ADD_INVITATION(state, invitation) {
  state.invitationsMap = mergeMapItem(state.invitationsMap, invitation);
}

export function ADD_INVITATIONS(state, invitations = []) {
  state.invitationsMap = invitations.reduce((invitationsMap, invitation) => {
    return mergeMapItem(invitationsMap || {}, invitation);
  }, state.invitationsMap);
}

export function DELETE_INVITATION(state, invitationId) {
  Vue.delete(state.invitationsMap, invitationId);
}

export function SET_USERS_TO_CHANNEL(state, { channelId, users = [] } = {}) {
  const editors = {};
  const viewers = {};
  for (let user of users) {
    if (user.can_edit) {
      editors[user.id] = user;
    } else if (user.can_view) {
      viewers[user.id] = user;
    }
  }
  state.channelUsersMap = mergeMapItem(state.channelUsersMap, { id: channelId, editors, viewers });
}

export function REMOVE_VIEWER_FROM_CHANNEL(state, { channelId, userId } = {}) {
  Vue.delete(state.channelUsersMap[channelId].viewers, userId);
}

export function ADD_EDITOR_TO_CHANNEL(state, { channelId, userId } = {}) {
  const user = ((state.channelUsersMap[channelId] || {}).viewers || {})[userId];
  if (user) {
    REMOVE_VIEWER_FROM_CHANNEL(state, { channelId, userId });
    Vue.set(state.channelUsersMap[channelId].editors, userId, user);
  }
}
