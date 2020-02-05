import pickBy from 'lodash/pickBy';
import { NOVALUE } from 'shared/constants';
import { Channel } from 'shared/data/resources';

/* CHANNEL LIST ACTIONS */
export function loadChannelList(context, payload = {}) {
  if (payload.listType) {
    payload[payload.listType] = true;
    delete payload.listType;
  }
  const params = {
    // Default to getting not deleted channels
    deleted: false,
    ...payload,
  };
  return Channel.where(params).then(channels => {
    context.commit('ADD_CHANNELS', channels);
    return channels;
  });
}

export function loadChannel(context, id) {
  return Channel.get(id)
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
    if (
      thumbnailData !== NOVALUE &&
      ['thumbnail', 'thumbnail_url', 'thumbnail_encoding'].every(attr => thumbnailData[attr])
    ) {
      channelData.thumbnail = thumbnailData.thumbnail;
      channelData.thumbnail_url = thumbnailData.thumbnail_url;
      channelData.thumbnail_encoding = thumbnailData.thumbnail_encoding;
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
