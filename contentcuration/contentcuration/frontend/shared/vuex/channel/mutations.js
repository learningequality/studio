import Vue from 'vue';
import map from 'lodash/map';
import pick from 'lodash/pick';
import { ContentDefaults, NEW_OBJECT } from 'shared/constants';
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

export function SET_CHANNEL_NOT_NEW(state, channelId) {
  if (state.channelsMap[channelId]) {
    Vue.delete(state.channelsMap[channelId], NEW_OBJECT);
  }
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
  for (let user of users) {
    const canEdit = user.can_edit;
    const canView = user.can_view;
    delete user.can_edit;
    delete user.can_view;
    Vue.set(state.channelUsersMap, user.id, user);
    if (canEdit) {
      ADD_EDITOR_TO_CHANNEL(state, { channel: channelId, user: user.id });
    } else if (canView) {
      ADD_VIEWER_TO_CHANNEL(state, { channel: channelId, user: user.id });
    }
  }
}

export function ADD_VIEWER_TO_CHANNEL(state, { channel, user } = {}) {
  if (!state.channelViewersMap[channel]) {
    Vue.set(state.channelViewersMap, channel, {});
  }
  Vue.set(state.channelViewersMap[channel], user, true);
}

export function REMOVE_VIEWER_FROM_CHANNEL(state, { channel, user } = {}) {
  if (state.channelViewersMap[channel]) {
    Vue.delete(state.channelViewersMap[channel], user);
  }
}

export function ADD_EDITOR_TO_CHANNEL(state, { channel, user } = {}) {
  if (!state.channelEditorsMap[channel]) {
    Vue.set(state.channelEditorsMap, channel, {});
  }
  Vue.set(state.channelEditorsMap[channel], user, true);
}

export function REMOVE_EDITOR_FROM_CHANNEL(state, { channel, user } = {}) {
  if (state.channelEditorsMap[channel]) {
    Vue.delete(state.channelEditorsMap[channel], user);
  }
}

export function SET_PAGE(
  state,
  {
    next = null,
    previous = null,
    page_number = null,
    count = null,
    total_pages = null,
    results = [],
  } = {}
) {
  state.page.next = next;
  state.page.previous = previous;
  state.page.page_number = page_number;
  state.page.count = count;
  state.page.total_pages = total_pages;
  state.page.results = map(results, r => r.id);
}

export function ADD_CHANNEL_TO_PAGE(state, channelId) {
  state.page.results = [channelId].concat(state.page.results);
}
