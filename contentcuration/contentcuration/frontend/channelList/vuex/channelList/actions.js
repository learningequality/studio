import Vue from 'vue';
import { Channel, Invitation } from 'shared/data/resources';
import { SharingPermissions } from 'shared/constants';

export function searchCatalog(context, params) {
  params.page_size = params.page_size || 100;
  params.public = true;
  params.published = true;
  let promise;
  if (context.rootGetters.loggedIn) {
    const bookmarkPromise = context.dispatch('channel/loadBookmarks', null, { root: true });
    promise = Promise.all([Channel.fetchCollection(params), bookmarkPromise]);
  } else {
    promise = Promise.all([Channel.searchCatalog(params), Promise.resolve()]);
  }

  return promise.then(([pageData]) => {
    context.commit('SET_PAGE', pageData);
    // Put channel data in our global channels map
    context.commit('channel/ADD_CHANNELS', pageData.results, { root: true });

    // Track search and # of results (copy to test public/published are automatically applied)
    const search = { ...params };
    delete search['public'];
    delete search['published'];
    delete search['page_size'];

    const category = Object.keys(search)
      .sort()
      .map(key => `${key}=${search[key]}`)
      .join('&');
    const trackingData = {
      total: pageData.count,
      matched: pageData.results.map(c => `${c.id} ${c.name}`),
    };
    Vue.$analytics.trackEvent('Catalog search', {
      eventAction: category,
      eventLabel: JSON.stringify(trackingData),
      ...trackingData,
    });
  });
}

/* INVITATION ACTIONS */
export function loadInvitationList(context) {
  return Invitation.where({
    invited: context.rootGetters.currentUserId,
  }).then(invitations => {
    context.commit(
      'SET_INVITATION_LIST',
      invitations.filter(i => !i.accepted && !i.declined && !i.revoked),
    );
    return invitations;
  });
}

export function acceptInvitation(context, invitationId) {
  const invitation = context.getters.getInvitation(invitationId);
  return Invitation.accept(invitationId)
    .then(() => {
      return context
        .dispatch('channel/loadChannel', invitation.channel, { root: true })
        .then(channel => {
          const data = { ...channel, bookmark: false, added: true };

          // Make sure correct access is given
          Object.values(SharingPermissions).forEach(permission => {
            data[permission] = false;
          });
          data[invitation.share_mode] = true;
          context.commit('channel/UPDATE_CHANNEL', data, { root: true });
          return channel;
        });
    })
    .then(() => loadInvitationList(context));
}

export function declineInvitation(context, invitationId) {
  return Invitation.decline(invitationId).then(() => {
    return context.commit('REMOVE_INVITATION', invitationId);
  });
}
