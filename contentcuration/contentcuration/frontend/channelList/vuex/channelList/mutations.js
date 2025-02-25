import Vue from 'vue';
import map from 'lodash/map';

export function SET_PAGE(
  state,
  {
    next = null,
    previous = null,
    page_number = null,
    count = null,
    total_pages = null,
    results = [],
  } = {},
) {
  state.page.next = next;
  state.page.previous = previous;
  state.page.page_number = page_number;
  state.page.count = count;
  state.page.total_pages = total_pages;
  state.page.results = map(results, r => r.id);
}

export function ADD_CHANNEL_DETAILS(state, { id, details }) {
  state.channelDetailsMap = {
    ...state.channelDetailsMap,
    [id]: details,
  };
}

/* INVITATION MUTATIONS */
export function SET_INVITATION_LIST(state, invitations) {
  const invitationsMap = {};
  invitations.forEach(invitation => {
    // If accepted or declined keys are defined, use their
    // value, otherwise set them explicitly to `false`.
    let { accepted, declined, revoked } = invitation;
    accepted = accepted || false;
    declined = declined || false;
    revoked = revoked || false;

    invitationsMap[invitation.id] = {
      ...invitation,
      accepted,
      declined,
      revoked,
    };
  });
  state.invitationsMap = invitationsMap;
}

export function REMOVE_INVITATION(state, invitationId) {
  return Vue.delete(state.invitationsMap, invitationId);
}
