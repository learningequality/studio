import _ from 'underscore';
import { ListTypes } from './constants';
import Models from 'edit_channel/models';
import State from 'edit_channel/state';

const ListValues = _.values(ListTypes);
export function prepChannel(channel) {
  // Set all channel list attributes so vue will listen to them
  _.each(ListValues, type => {
    channel[type] = false;
  });
}

export function getDefaultChannel() {
  return {
    name: '',
    description: '',
    editors: [State.current_user.id],
    pending_editors: [],
    language: State.preferences && State.preferences.language,
    content_defaults: State.preferences,
    thumbnail: '',
    thumbnail_encoding: {},
  };
}

export function getBackboneChannel(channel) {
  return new Models.ChannelModel(channel);
}

export function getChannelSetModel(channelSet) {
  return new Models.ChannelSetModel(channelSet);
}
