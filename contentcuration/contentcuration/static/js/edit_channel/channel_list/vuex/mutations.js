import _ from 'underscore';
import { ListTypes } from './../constants';

const ListValues = _.values(ListTypes);
function prepChannel(channel) {
	// Set all channel list attributes so vue will listen to them
	_.each(ListValues, (type) => {
		channel[type] = false;
	});
}


/* CHANNEL LIST MUTATIONS */

exports.SET_ACTIVE_CHANNEL = function(state, channel) {
	state.activeChannel = channel;
	state.channelChanges = _.clone(state.activeChannel);
}

exports.SET_CHANNEL_LIST = function(state, payload) {
	let listValues = _.values(ListTypes);
	_.each(payload.channels, (channel)=> {
		let match = _.findWhere(state.channels, {id: channel.id})
		if(match) {  // If it exists, set the existing channel's listType to true
			match[payload.listType] = true;
		} else {  // Otherwise, add to the list of channels
			prepChannel(channel);
			channel[payload.listType] = true;
			state.channels.push(channel);
		}
	});
}

exports.ADD_CHANNEL = function(state, channel) {
	state.channels.unshift(channel);
}



/* CHANNEL EDITOR MUTATIONS */
exports.SUBMIT_CHANNEL = function(state, channel) {
	// If this is an existing channel, update the fields
	// Otherwise, add new channels to the list
	let match = _.findWhere(state.channels, {id: channel.id});
	if (match) {
		_.each(_.pairs(channel), (val) => {
			match[val[0]] = val[1];
		});
	} else {
		prepChannel(channel);
		channel.EDITABLE = true;
		state.channels.unshift(channel);
	}
	state.changed = false;
}

exports.CANCEL_CHANNEL_CHANGES = function(state) {
	state.changed = false;
	state.channelChanges = _.clone(state.activeChannel);
}

exports.REMOVE_CHANNEL = function(state, channelID) {
	state.channels = _.reject(state.channels, (c) => {
		return c.id === channelID;
	});

	// Remove channel from channel sets too
	_.each(state.channelSets, (channelset) => {
		channelset.channels = _.reject(channelset.channels, (cid) => {
			return cid === channelID;
		});
	});
	state.changed = false;
}

exports.SET_CHANNEL_NAME = function(state, name) {
	state.channelChanges.name = name;
	state.changed = true;
}

exports.SET_CHANNEL_DESCRIPTION = function(state, description) {
	state.channelChanges.description = description.trim();
	state.changed = true;
}

exports.SET_CHANNEL_THUMBNAIL = function(state, payload) {
	state.channelChanges.thumbnail = payload.thumbnail;
	state.channelChanges.thumbnail_encoding = payload.encoding;
	state.changed = true;
}
exports.SET_CHANNEL_LANGUAGE = function(state, language) {
	state.channelChanges.language = language;
	state.changed = true;
}



/* CHANNEL SET MUTATIONS */
exports.SET_CHANNELSET_LIST = function(state, channelSets) {
	state.channelSets = channelSets;
}

exports.ADD_CHANNELSET = function(state, channelSet) {
	/* TODO: REMOVE BACKBONE */
	state.channelSets.push(channelSet.toJSON());
}

exports.REMOVE_CHANNELSET = function(state, channelSetID) {
	state.channelSets = _.reject(state.channelSets, (set)=> {
		return set.id === channelSetID;
	});
}



/* INVITATION MUTATIONS */
exports.SET_INVITATION_LIST = function(state, invitations) {
	state.invitations = invitations;
}

exports.REMOVE_INVITATION = function(state, invitationID) {
	state.invitations = _.reject(state.invitations, (invitation)=> {
		return invitation.id === invitationID;
	});
}
