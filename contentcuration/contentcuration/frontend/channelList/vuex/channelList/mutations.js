import Vue from 'vue';
import map from 'lodash/map';

export function SET_PAGE(state, pageData) {
  state.page = pageData;
  state.page.results = map(pageData.results, r => r.id);
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
    invitationsMap[invitation.id] = {
      ...invitation,
      accepted: false,
      declined: false,
    };
  });
  state.invitationsMap = invitationsMap;
}

export function ACCEPT_INVITATION(state, invitationId) {
  state.invitationsMap[invitationId].accepted = true;
}

export function DECLINE_INVITATION(state, invitationId) {
  state.invitationsMap[invitationId].declined = true;
}

export function REMOVE_INVITATION(state, invitationId) {
  Vue.delete(state.invitationsMap, invitationId);
}
