
import _ from 'underscore';
import { PermissionRanks } from '../constants';

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

	_.each(PermissionRanks, (permission) => {
		if(permission.field && _.contains(state.channel[permission.field], userID)){
			state.channel[permission.field] = _.reject(state.channel[permission.field], (user) => {
				return user === userID;
			})
		}
	});
}

export function SET_INVITATIONS(state, invitations) {
  state.invitations = invitations;
}

export function ADD_INVITATION(state, invitation) {
	let match = _.findWhere(state.invitations, {id: invitation.id});
	if(match) {
		match.share_mode = invitation.share_mode;
	} else {
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
