import { ChannelInvitationMapping } from '../../constants';
import { isTempId } from '../../utils';
import client from 'shared/client';
import { channelLastSavedState } from './index';


/* CHANNEL LIST ACTIONS */
export function loadChannelList(context, { listType, ids } = {}) {
  const params = {};
  if (listType) {
    params[listType] = true;
  }
  if (ids) {
    params['ids'] = ids;
  }
  return client.get(window.Urls['channelslim-list'](), { params }).then(response => {
    const channels = response.data;
    context.commit('ADD_CHANNELS', channels);
    return channels;
  });
}

export function addStar(context, channelId) {
  context.commit('SET_CHANNEL_BOOKMARK', { id: channelId, bookmark: true });
  return client
    .post(window.Urls.add_bookmark(), {
      channel_id: channelId,
      user_id: context.rootGetters.currentUserId,
    })
    .catch(() => {
      context.commit('SET_CHANNEL_BOOKMARK', { id: channelId, bookmark: false });
    });
}

export function removeStar(context, channelId) {
  context.commit('SET_CHANNEL_BOOKMARK', { id: channelId, bookmark: false });
  return client
    .post(window.Urls.remove_bookmark(), {
      channel_id: channelId,
      user_id: context.rootGetters.currentUserId,
    })
    .catch(() => {
      context.commit('SET_CHANNEL_BOOKMARK', { id: channelId, bookmark: true });
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
          context.commit('ADD_CHANNEL', response.data);
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
  return client.get(window.Urls.get_topic_details(channelId)).then(response => {
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
  return client
    .post(window.Urls.accept_channel_invite(), { invitation_id: invitationId })
    .then(response => {
      context.commit('ACCEPT_INVITATION', invitationId);
      const channel = response.data;
      let listType = ChannelInvitationMapping[invitation.share_mode];
      channel[listType] = true;
      context.commit('ADD_CHANNEL', channel);
      return channel;
    });
}

export function declineInvitation(context, invitationId) {
  return client.delete(window.Urls.invitation_detail(invitationId)).then(() => {
    context.commit('DECLINE_INVITATION', invitationId);
  });
}
