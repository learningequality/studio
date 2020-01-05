import client from 'shared/client';

export function searchCatalog(context, params) {
  params.page_size = params.page_size || 25;
  params.public = true;
  return client.get(window.Urls['channel-list'](), { params }).then(response => {
    context.commit('SET_PAGE', response.data);
  });
}

export function loadChannelDetails(context, channelId) {
  return client.get(window.Urls.get_channel_details(channelId)).then(response => {
    context.commit('ADD_CHANNEL_DETAILS', { id: channelId, details: response.data });
  });
}

/* INVITATION ACTIONS */
export function loadInvitationList(context) {
  return client
    .get(window.Urls.invitation_list(), { params: { invited: context.rootGetters.currentUserId } })
    .then(response => {
      const invitations = response.data;
      context.commit('SET_INVITATION_LIST', invitations);
      return invitations;
    });
}

export function acceptInvitation(context, invitationId) {
  const invitation = context.getters.getInvitation(invitationId);
  return client
    .delete(window.Urls.invitation_detail(invitationId), { params: { accepted: true } })
    .then(() => {
      context.commit('ACCEPT_INVITATION', invitationId);
      return context.dispatch('loadChannel', invitation.channel_id);
    });
}

export function declineInvitation(context, invitationId) {
  return client.delete(window.Urls.invitation_detail(invitationId)).then(() => {
    context.commit('DECLINE_INVITATION', invitationId);
  });
}
