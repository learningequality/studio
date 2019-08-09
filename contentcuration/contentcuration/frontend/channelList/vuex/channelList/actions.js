import { ChannelInvitationMapping } from '../../constants';
import { isTempId } from '../../utils';
import client from 'shared/client';
import { channelLastSavedState } from './index';


/* CHANNEL LIST ACTIONS */
export function loadChannelList(context, listType) {
  const params = {};
  if (listType) {
    params[listType] = true;
  }
  return client.get(window.Urls['channel-list'](), { params }).then(response => {
    const channels = response.data;
    context.commit('ADD_CHANNELS', channels);
    return channels;
  });
}

export function loadChannel(context, id) {
  return client.get(window.Urls['channel-detail'](id)).then(response => {
    const channel = response.data;
    context.commit('ADD_CHANNELS', [channel]);
    return channel;
  }).catch(() => {
    return;
  });
}

/* CHANNEL EDITOR ACTIONS */
export function saveChannel(context, channelId) {
  if (context.getters.getChannelIsValid(channelId)) {
    const channelData = channelLastSavedState.getUnsavedChanges(context.getters.getChannel(channelId));
    if (Object.keys(channelData).length) {
      if (isTempId(channelId)) {
        if (!channelData.editors || channelData.editors.length === 0) {
          channelData.editors = [context.rootGetters.currentUserId];
        }
        delete channelData.id;
        return client.post(window.Urls['channel-list'](), channelData).then(response => {
          const channel = response.data;
          context.commit('ADD_CHANNEL', channel);
          context.commit('REMOVE_CHANNEL', channelId);
          return channel.id;
        });
      }

      return client
        .patch(window.Urls['channel-detail'](channelId), channelData)
        .then(response => {
          // If successful the data will just be true, so update our last saved state with the current vuex state.
          if (response.data) {
            channelLastSavedState.storeLastSavedState(context.getters.getChannel(channelId));
          }
          return null;
        });
    }
  }
}

export function deleteChannel(context, channelId) {
  return client
    .patch(window.Urls['channel-details'](channelId), { deleted: true })
    .then(response => {
      const channel = response.data;
      context.commit('REMOVE_CHANNEL', channel.id);
    });
}

export function loadChannelDetails(context, channelId) {
  return client.get(window.Urls.get_channel_details(channelId)).then(response => {
    return response.data;
  });
}

/* INVITATION ACTIONS */
export function loadInvitationList(context) {
  return client.get(window.Urls.invitation_list(), { params: { invited: context.rootGetters.currentUserId }}).then(response => {
    const invitations = response.data;
    context.commit('SET_INVITATION_LIST', invitations);
    return invitations;
  });
}

export function acceptInvitation(context, invitationId) {
  const invitation = context.getters.getInvitation(invitationId);
  return client.delete(window.Urls.invitation_detail(invitationId), { params: { accepted: true }}).then(() => {
    context.commit('ACCEPT_INVITATION', invitationId);
    return loadChannel(context, invitation.channel_id);
  });
}

export function declineInvitation(context, invitationId) {
  return client.delete(window.Urls.invitation_detail(invitationId)).then(() => {
    context.commit('DECLINE_INVITATION', invitationId);
  });
}
