import Vue from 'vue';
import _ from 'underscore';
import State from 'edit_channel/state';

import Models from 'edit_channel/models';
import { ChannelSetModalView } from 'edit_channel/channel_set/views';
import { ListTypes, ChannelListUrls } from './../constants';
import fileDownload from 'jquery-file-download';


/* CHANNEL LIST ACTIONS */
export function loadChannelList(context, listType) {
	return new Promise((resolve, reject) => {
		$.ajax({
	        method: "GET",
	        url: ChannelListUrls[listType],
	        error: reject,
	        success: (channels) => {
	        	context.commit('SET_CHANNEL_LIST', {
					listType: listType,
					channels: channels
				});
				resolve(channels);
	        }
	    });
	});
}

export function addStar(context, channel) {
	channel.STARRING = true;
	$.ajax({
        method: "POST",
        data: JSON.stringify({
            "channel_id": channel.id,
            "user_id": State.current_user.id
        }),
        url: window.Urls.add_bookmark(),
        success: () => {
        	channel.STARRED = true;
        	channel.STARRING = false;
        }
    });
}

export function removeStar(context, channel) {
	channel.STARRING = true;
	$.ajax({
        method: "POST",
        data: JSON.stringify({
            "channel_id": channel.id,
            "user_id": State.current_user.id
        }),
        url: window.Urls.remove_bookmark(),
        success: () => {
        	channel.STARRED = false;
        	channel.STARRING = false;
        }
    });
}


/* CHANNEL EDITOR ACTIONS */
export function saveChannel(context) {
	/* TODO: REMOVE BACKBONE */
	return new Promise((resolve, reject) => {
		new Models.ChannelModel().save(context.state.channelChanges, {
			patch: true,
            error: reject,
            success: (channel) => {
            	channel = channel.toJSON();
            	context.commit('SUBMIT_CHANNEL', channel);
            	context.commit('SET_ACTIVE_CHANNEL', channel); // Used for new channelss
            	resolve(channel);
            }
        });
    });
}

export function deleteChannel(context, channel) {
	/* TODO: REMOVE BACKBONE */
	return new Promise((resolve, reject) => {
		new Models.ChannelModel(channel).save({"deleted": true}, {
            error: reject,
            success: () => {
            	context.commit('REMOVE_CHANNEL', channel.id);
            	context.commit('SET_ACTIVE_CHANNEL', null);
            	resolve();
            }
        });
    });
}

export function loadNodeDetails(context, nodeID) {
    return new Promise(function (resolve, reject) {
        $.ajax({
            method: "GET",
            url: window.Urls.get_topic_details(nodeID),
            error: reject,
            success: (result) => {
            	let node = new Models.ContentNodeModel({'metadata': JSON.parse(result)});
                node.id = nodeID;
                resolve(node);
            }
        });
    });
}

export function downloadChannelDetails(context, payload) {
	return new Promise(function (resolve, reject) {
        let url = "";
        switch(payload.format) {
    		case "detailedPdf":
    			url = window.Urls.get_channel_details_pdf_endpoint(payload.id);
    			break;
    		case "csv":
    			url = window.Urls.get_channel_details_csv_endpoint(payload.id);
    			break;
    		case "ppt":
    			url = window.Urls.get_channel_details_ppt_endpoint(payload.id);
    			break;
    		default:
    			url = window.Urls.get_channel_details_pdf_endpoint(payload.id) + "?condensed=true";
    	}
		$.fileDownload(url, {
			successCallback: resolve,
            failCallback: (responseHtml, url) => {
    			reject(responseHtml);
            }
        });
    });
}

export function getChannelModel(context, channel) {
	/* TODO: REMOVE BACKBONE, needed for image upload view */
	return new Models.ChannelModel(channel);
}



/* CHANNEL SET ACTIONS */
export function loadChannelSetList(context) {
	return new Promise((resolve, reject) => {
		$.ajax({
            method: "GET",
            url: window.Urls.get_user_channel_sets(),
            error: reject,
            success: (channelSets) => {
            	context.commit('SET_CHANNELSET_LIST', channelSets);
				resolve(channelSets);
            }
        });
    });
}

export function getChannelSetModel(context, channelSet) {
    /* TODO: REMOVE BACKBONE, needed for channel set modal view */
    return new Models.ChannelSetModel(channelSet);
}

export function deleteChannelSet(context, channelSet) {
	/* TODO: REMOVE BACKBONE */
	new Models.ChannelSetModel(channelSet).destroy({
		success: function() {
			context.commit('REMOVE_CHANNELSET', channelSet.id);
		}
	});
}



/* INVITATION ACTIONS */
export function loadChannelInvitationList(context) {
	return new Promise((resolve, reject) => {
		$.ajax({
            method: "GET",
            url: window.Urls.get_user_pending_channels(),
            error: reject,
            success: (invitations) => {
            	context.commit('SET_INVITATION_LIST', invitations);
				resolve(invitations);
            }
        });
    });
}

export function acceptInvitation(context, invitation) {
	return new Promise((resolve, reject) => {
		$.ajax({
            method: "POST",
            url: window.Urls.accept_channel_invite(),
            data: { "invitation_id": invitation.id },
            error: reject,
            success: (channel) => {
    			prepChannel(channel);
    			switch(invitation.share_mode) {
    				case 'edit':
    					channel[ListTypes.EDITABLE] = true;
    					context.commit('SET_ACTIVE_LIST', ListTypes.EDITABLE);
    					break;
    				case 'view':
    					channel[ListTypes.VIEW_ONLY] = true;
    					context.commit('SET_ACTIVE_LIST', ListTypes.VIEW_ONLY);
    					break;
    			}
    			context.commit('ADD_CHANNEL', channel);
    			resolve(channel);
            }
        });
    });
}

export function declineInvitation(context, invitation) {
	/* TODO: REMOVE BACKBONE */
	return new Promise((resolve, reject) => {
		let invite = new Models.InvitationModel(invitation);
		invite.destroy({ success: resolve, error: reject })
    });
}
