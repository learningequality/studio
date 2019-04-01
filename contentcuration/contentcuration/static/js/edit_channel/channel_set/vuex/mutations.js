var { PageTypes } = require('../constants');

export function UPDATE_CHANNELS_LOADED(state, isLoading) {
  state.loadChannels = isLoading;
}

export function UPDATE_LOADED_CHANNEL_LISTS(state, channelListName) {
  state.loadedChannelLists.push(channelListName);
}

export function UPDATE_CHANNELS(state, channels) {
  state.channels = channels;
}

export function UPDATE_ALL_CHANNELS(state, data) {
  state.allChannels[data.key] = data.value;
}

export function UPDATE_PAGE_STATE(state, payload) {
  state.pageState = {
    pageType: payload.pageType,
    data: payload.data || {},
  };
}

export function RESET_PAGE_STATE(state) {
  Object.assign(state, {
    loadChannels: true,
    name: '',
    description: '',
    channels: [],
    saving: false,
    closing: false,
    error: false,
    allChannels: {},
    changed: false,
    channelSet: null,
    isNewSet: false,
    stopValidation: false,
    pageState: {
      pageType: PageTypes.VIEW_CHANNELS,
      data: {},
    },
  });
}

export function SET_CHANNEL_SET(state, channelSet) {
  state.name = channelSet.get('name');
  state.description = channelSet.get('description');
  state.channelSet = channelSet;
}

export function PREPARE_CHANNEL_SET_FOR_SAVE(state) {
  state.stopValidation = false;
  state.error = false;
  state.channelSet.set('name', state.name);
  state.channelSet.set('description', state.description);
}

export function SET_IS_NEW(state, isNew) {
  state.stopValidation = isNew;
  state.isNewSet = isNew;
}

export function SET_NAME(state, name) {
  state.name = name;
  state.changed = name !== state.channelSet.get('name');
}

export function SET_DESCRIPTION(state, description) {
  state.description = description;
  state.changed = description !== state.channelSet.get('description');
}

export function ADD_CHANNEL_TO_SET(state, channel) {
  state.channels.push(channel);
  state.changed = true;
}

export function REMOVE_CHANNEL_FROM_SET(state, channel) {
  state.channels = state.channels.filter(function(c) {
    return c.id !== channel.id;
  });
  state.changed = true;
}

export function SET_CHANGED(state, changed) {
  state.changed = changed;
}

export function SET_SAVING(state, saving) {
  state.saving = saving;
}

export function SET_CLOSING(state, closing) {
  state.closing = closing;
}

export function SET_ERROR(state, error) {
  state.error = error;
}
