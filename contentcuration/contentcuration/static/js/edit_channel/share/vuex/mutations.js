
import _ from 'underscore';

export function SET_CHANNEL(state, channel) {
  state.channel = channel;
}

export function SET_ACCESS_LIST(state, accessList) {
  state.accessList = accessList;
}

export function ADD_USER(state, user) {
	state.accessList.push(user);
	state.channel.editors.push(user.id);
}

export function REMOVE_USER(state, userID) {
	state.accessList = _.reject(state.accessList, (user) => {
		return user.id === userID;
	});
	state.channel.editors = _.pluck(state.accessList, 'id');
	state.channel.viewers = _.pluck(state.accessList, 'id');
}

export function SET_INVITATIONS(state, invitations) {
  state.invitations = invitations;
}

export function ADD_INVITATION(state, invitation) {
	if(!_.findWhere(state.invitations, {id: invitation.id})) {
		state.invitations.push(invitation);
	}
	state.recentlySent = invitation.id;
	setTimeout(() => {
		state.recentlySent = null;
	}, 3000);
}

export function REMOVE_INVITATION(state, invitationID) {
	state.invitations = _.reject(state.invitations, (invite) => {
		return invite.id === invitationID;
	});
}

export function RESET(state) {
  Object.assign(state, {
    accessList: [],
    invitations: [],
    channel: null
  });
}
