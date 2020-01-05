import { channelLastSavedState } from './index';
import { isTempId } from 'shared/utils';

export function channels(state) {
  return Object.values(state.channelsMap).filter(channel => !isTempId(channel.id));
}

export function getChannel(state) {
  return function(channelId) {
    return state.channelsMap[channelId];
  };
}

export function getChannels(state) {
  return function(channelIds) {
    return channelIds.map(key => state.channelsMap[key]).filter(channel => channel);
  };
}

export function getChannelUnsaved(state) {
  return function(channelId) {
    const channel = state.channelsMap[channelId];
    return channel ? channelLastSavedState.hasUnsavedChanges(channel) : false;
  };
}

export function getChannelIsValid(state) {
  return function(channelId) {
    const channel = state.channelsMap[channelId];
    return channel && channel.name && channel.name.length > 0;
  };
}
