import pickBy from 'lodash/pickBy';
import { NOVALUE } from 'shared/constants';
import { Channel, Invitation, User } from 'shared/data/resources';
import client from 'shared/client';

/* CHANNEL LIST ACTIONS */
export function loadChannelList(context, payload = {}) {
  if (payload.listType) {
    payload[payload.listType] = true;
    delete payload.listType;
  }
  return Channel.where(payload).then(channels => {
    context.commit('ADD_CHANNELS', channels);
    return channels;
  });
}

export function loadChannel(context, id) {
  let promise;
  if (context.rootState.session.loggedIn) {
    promise = Channel.get(id);
  } else {
    promise = Channel.getCatalogChannel(id);
  }

  return promise
    .then(channel => {
      context.commit('ADD_CHANNEL', channel);
      return channel;
    })
    .catch(() => {
      return;
    });
}

/* CHANNEL EDITOR ACTIONS */

export function createChannel(context) {
  const session = context.rootState.session;
  const channelData = {
    name: '',
    description: '',
    language: session.preferences ? session.preferences.language : session.currentLanguage,
    content_defaults: session.preferences,
    thumbnail_url: '',
    bookmark: false,
    edit: true,
    deleted: false,
    editors: [session.currentUser.id],
    viewers: [],
    new: true,
  };
  return Channel.put(channelData).then(id => {
    context.commit('ADD_CHANNEL', {
      id,
      ...channelData,
    });
    return id;
  });
}

export function updateChannel(
  context,
  {
    id,
    name = NOVALUE,
    description = NOVALUE,
    thumbnailData = NOVALUE,
    language = NOVALUE,
    contentDefaults = NOVALUE,
  } = {}
) {
  if (context.state.channelsMap[id]) {
    const channelData = {};
    if (!id) {
      throw ReferenceError('id must be defined to update a channel');
    }
    if (name !== NOVALUE) {
      channelData.name = name;
    }
    if (description !== NOVALUE) {
      channelData.description = description;
    }
    if (thumbnailData !== NOVALUE) {
      channelData.thumbnail = thumbnailData.thumbnail;
      channelData.thumbnail_url = thumbnailData.thumbnail_url;
      channelData.thumbnail_encoding = thumbnailData.thumbnail_encoding || {};
    }
    if (language !== NOVALUE) {
      channelData.language = language;
    }
    if (contentDefaults !== NOVALUE) {
      const originalData = context.state.channelsMap[id].content_defaults;
      // Pick out only content defaults that have been changed.
      contentDefaults = pickBy(contentDefaults, (value, key) => value !== originalData[key]);
      if (Object.keys(contentDefaults).length) {
        channelData.content_defaults = contentDefaults;
      }
    }
    context.commit('UPDATE_CHANNEL', { id, ...channelData });
    return Channel.update(id, channelData);
  }
}

export function bookmarkChannel(context, { id, bookmark }) {
  return Channel.update(id, { bookmark }).then(() => {
    context.commit('SET_BOOKMARK', { id, bookmark });
  });
}

export function deleteChannel(context, channelId) {
  return Channel.update(channelId, { deleted: true }).then(() => {
    context.commit('REMOVE_CHANNEL', { id: channelId });
  });
}

export function loadChannelDetails(context, channelId) {
  return client.get(window.Urls.get_channel_details(channelId)).then(response => {
    return response.data;
  });
}

export function getChannelListDetails(context, { excluded = [], ...query }) {
  // Make sure we're querying for all channels that match the query
  query.public = true;
  query.published = true;
  query.page_size = Number.MAX_SAFE_INTEGER;
  query.page = 1;

  return Channel.searchCatalog(query).then(page => {
    const results = page.results.filter(channel => !excluded.includes(channel.id));
    const promises = results.map(channel => loadChannelDetails(context, channel.id));
    return Promise.all(promises).then(responses => {
      return responses.map((data, index) => {
        return {
          ...results[index],
          ...data,
        };
      });
    });
  });
}

/* SHARING ACTIONS */

export function loadChannelUsers(context, channelId) {
  return Promise.all([
    User.where({ channel: channelId, include_viewonly: true }),
    Invitation.where({ channel: channelId }),
  ]).then(results => {
    context.commit('ADD_USERS', results[0]);
    context.commit('ADD_INVITATIONS', results[1]);
  });
}

export function sendInvitation(context, { channelId, email, shareMode }) {
  return client
    .post(window.Urls.send_invitation_email(), {
      user_email: email,
      share_mode: shareMode,
      channel_id: channelId,
    })
    .then(response => {
      context.commit('ADD_INVITATION', response.data);
    });
}

export function deleteInvitation(context, invitationId) {
  // return Invitation.delete(invitationId).then(() => {
  //   context.commit('DELETE_INVITATION', invitationId);
  // });
  // Update so that other user's invitations disappear
  return Invitation.update(invitationId, { declined: true }).then(() => {
    context.commit('DELETE_INVITATION', invitationId);
  });
}

export function makeEditor(context, { channelId, userId }) {
  let updates = {
    editors: context.state.channelsMap[channelId].editors.concat([userId]),
    viewers: context.state.channelsMap[channelId].viewers.filter(id => id !== userId),
  };
  return Channel.update(channelId, updates).then(() => {
    context.commit('UPDATE_CHANNEL', { id: channelId, ...updates });
  });
}

export function removeViewer(context, { channelId, userId }) {
  let viewers = context.state.channelsMap[channelId].viewers.filter(id => id !== userId);
  return Channel.update(channelId, { viewers }).then(() => {
    context.commit('UPDATE_CHANNEL', { id: channelId, viewers });
  });
}
