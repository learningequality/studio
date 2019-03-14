var _ = require('underscore');
var Models = require('edit_channel/models');

import State from 'edit_channel/state';
import { Permissions } from '../constants';

export function loadAccessList(context) {
  let editors = _.chain(context.getters.channel.editors)
  				 .union(context.getters.channel.viewers)
  				 .value();

  return new Models.UserCollection().get_all_fetch(editors).then((result) => {
    context.commit('SET_ACCESS_LIST', result.toJSON());
  });
}

export function addEditor(context, payload) {
	return new Promise(function (resolve, reject) {
		$.ajax({
			method: "POST",
			data: JSON.stringify({
				"channel_id": context.getters.channel.id,
				"user_id": user.id
			}),
			url: window.Urls.make_editor(),
			success: () => {
				context.commit("ADD_USER", user)
				resolve();
			},
			error: (error) => { reject(error.responseText); }
		});
	});
}

export function removeUser(context, user) {
	return new Promise(function (resolve, reject) {

		$.ajax({
			method: "POST",
			data: JSON.stringify({
				"channel_id": context.getters.channel.id,
				"user_id": user.id
			}),
			url: window.Urls.remove_editor(),
			success: () => {
				context.commit("REMOVE_USER", user.id)
				resolve();
			},
			error: (error) => { reject(error.responseText); }
		});
	});
}

export function loadInvitationList(context) {
  return new Models.InvitationCollection().get_all_fetch(context.getters.channel.pending_editors).then((invitations) => {
  	context.commit('SET_INVITATIONS', invitations.toJSON());
  });
}

export function sendInvitation(context, payload) {
	return new Promise(function(resolve, reject){
		// TODO: Remove once owner permission is properly handled
		let share_mode = payload.share_mode;
		if(share_mode === Permissions.OWNER) {
			share_mode = Permissions.EDIT;
		}

    var data = {
      "channel_id": context.getters.channel.id,
      "user_email": payload.email,
      "share_mode": share_mode,
      "upgrade": payload.upgrade || false,
      "reinvite": payload.reinvite || false,
    };
    $.ajax({
      method:"POST",
        url: window.Urls.send_invitation_email(),
        data:  JSON.stringify(data),
        success:function(data){
        	data = JSON.parse(data);
        	if(!data.prompt_to_upgrade && !data.reinvite) {
        		context.commit("ADD_INVITATION", data)
        	}
        	resolve(data);
        },
        error:function(error){
          console.error(error);
          reject(error.responseText || error);
        }
    });
  });
}

export function deleteInvitation(context, invitation) {
	return new Promise((resolve, reject) => {
		new Models.InvitationModel(invitation).destroy({
			success: () => {
				context.commit('REMOVE_INVITATION', invitation.id);
				resolve();
			},
			error: reject
		})
	})
}
