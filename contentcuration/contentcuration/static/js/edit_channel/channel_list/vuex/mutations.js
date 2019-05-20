import _ from 'underscore';
import { prepChannel, getDefaultChannel } from './../utils';

export function RESET_STATE(state) {
  Object.assign(state, {
    channels: [],
    activeChannel: null,
    changed: false,
    channelChanges: {},
    channelSets: [],
    invitations: [],
  });
}

/* CHANNEL LIST MUTATIONS */
export function SET_ACTIVE_CHANNEL(state, channelID) {
  state.activeChannel =
    channelID === '' ? getDefaultChannel() : _.findWhere(state.channels, { id: channelID });
  state.channelChanges = _.clone(state.activeChannel);
}

export function SET_CHANNEL_LIST(state, payload) {
  _.each(payload.channels, channel => {
    let match = _.findWhere(state.channels, { id: channel.id });
    if (match) {
      // If it exists, set the existing channel's listType to true
      match[payload.listType] = true;
    } else {
      // Otherwise, add to the list of channels
      prepChannel(channel);
      channel[payload.listType] = true;
      state.channels.push(channel);
    }
  });
}

export function ADD_CHANNEL(state, channel) {
  state.channels.unshift(channel);
}

/* CHANNEL EDITOR MUTATIONS */
export function SUBMIT_CHANNEL(state, channel) {
  // If this is an existing channel, update the fields
  // Otherwise, add new channels to the list
  let match = _.findWhere(state.channels, { id: channel.id });
  if (match) {
    _.each(_.pairs(channel), val => {
      match[val[0]] = val[1];
    });
  } else {
    prepChannel(channel);
    channel.EDITABLE = true;
    state.channels.unshift(channel);
  }
  state.changed = false;
}

export function CLEAR_CHANNEL_CHANGES(state) {
  state.channelChanges = getDefaultChannel();
}

export function CANCEL_CHANNEL_CHANGES(state) {
  state.changed = false;
}

export function REMOVE_CHANNEL(state, channelID) {
  state.channels = _.reject(state.channels, c => {
    return c.id === channelID;
  });

  // Remove channel from channel sets too
  _.each(state.channelSets, channelset => {
    channelset.channels = _.reject(channelset.channels, cid => {
      return cid === channelID;
    });
  });
  state.changed = false;
}

export function SET_CHANNEL_NAME(state, name) {
  state.channelChanges.name = name;
  state.changed = true;
}

export function SET_CHANNEL_DESCRIPTION(state, description) {
  state.channelChanges.description = description.trim();
  state.changed = true;
}

export function SET_CHANNEL_THUMBNAIL(state, payload) {
  state.channelChanges.thumbnail = payload.thumbnail;
  state.channelChanges.thumbnail_encoding = payload.encoding;
  state.changed = true;
}

export function SET_CHANNEL_LANGUAGE(state, language) {
  state.channelChanges.language = language;
  state.changed = true;
}

export function SET_CHANGED(state, changed) {
  state.changed = changed;
}

/* CHANNEL SET MUTATIONS */
export function SET_CHANNELSET_LIST(state, channelSets) {
  state.channelSets = channelSets;
}

export function ADD_CHANNELSET(state, channelSet) {
  /* TODO: REMOVE BACKBONE */
  state.channelSets.push(channelSet.toJSON());
}

export function REMOVE_CHANNELSET(state, channelSetID) {
  state.channelSets = _.reject(state.channelSets, set => {
    return set.id === channelSetID;
  });
}

/* INVITATION MUTATIONS */
export function SET_INVITATION_LIST(state, invitations) {
  state.invitations = invitations;
}

export function REMOVE_INVITATION(state, invitationID) {
  state.invitations = _.reject(state.invitations, invitation => {
    return invitation.id === invitationID;
  });
}
