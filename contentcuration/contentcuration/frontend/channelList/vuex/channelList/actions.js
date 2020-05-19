import { Channel, Invitation } from 'shared/data/resources';
import tracker from 'shared/analytics/tracker';
import { SharingPermissions } from 'shared/constants';

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

    // Track search and # of results (copy to test public/published are automatically applied)
    const search = { ...params };
    delete search['public'];
    delete search['published'];
    tracker.track('Public channel list', 'Search', {
      resultCount: pageData.count,
      search,
    });
  });
}

/* INVITATION ACTIONS */
export function loadInvitationList(context) {
  return Invitation.where({ invited: context.rootGetters.currentUserId }).then(invitations => {
    context.commit('SET_INVITATION_LIST', invitations);
    return invitations;
  });
}

export function acceptInvitation(context, invitationId) {
  const invitation = context.getters.getInvitation(invitationId);
  return Invitation.update(invitationId, { accepted: true }).then(() => {
    context.commit('ACCEPT_INVITATION', invitationId);
    return context
      .dispatch('channel/loadChannel', invitation.channel, { root: true })
      .then(channel => {
        let data = { id: channel.id, bookmark: false };

        // Make sure correct access is given
        Object.values(SharingPermissions).forEach(permission => {
          data[permission] = false;
        });
        data[invitation.share_mode] = true;
        context.commit('channel/UPDATE_CHANNEL', data, { root: true });
        return channel;
      });
  });
}

export function declineInvitation(context, invitationId) {
  return Invitation.update(invitationId, { declined: true }).then(() => {
    context.commit('DECLINE_INVITATION', invitationId);
  });
}
