import client from 'shared/client';
import { Channel } from 'shared/data/resources';
import tracker from 'shared/analytics/tracker';

export function searchCatalog(context, params) {
  params.page_size = params.page_size || 100;
  params.public = true;
  params.published = true;
  let promise;
  if (context.rootState.session.loggedIn) {
    promise = Channel.requestCollection(params);
  } else {
    promise = Channel.searchCatalog(params);
  }
  return promise.then(pageData => {
    context.commit('SET_PAGE', pageData);
    // Put channel data in our global channels map
    context.commit('channel/ADD_CHANNELS', pageData.results, { root: true });

    // Track search and # of results
    delete params['public'];
    delete params['published'];
    tracker.track('Public channel list', 'Search', {
      resultCount: pageData.count,
      search: params,
    });
  });
}

export function getPublicLanguages() {
  return client.get(window.Urls.get_public_channel_languages()).then(response => {
    return response.data;
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
      return context.dispatch('channel/loadChannel', invitation.channel_id, { root: true });
    });
}

export function declineInvitation(context, invitationId) {
  return client.delete(window.Urls.invitation_detail(invitationId)).then(() => {
    context.commit('DECLINE_INVITATION', invitationId);
  });
}
