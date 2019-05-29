import { ChannelListUrls, ChannelInvitationMapping } from './../constants';
import { prepChannel } from './../utils';
import State from 'edit_channel/state';

import Models from 'edit_channel/models';

require('jquery-file-download');

/* CHANNEL LIST ACTIONS */
export function loadChannelList(context, listType) {
  return new Promise((resolve, reject) => {
    $.ajax({
      method: 'GET',
      url: ChannelListUrls[listType],
      error: reject,
      success: channels => {
        context.commit('SET_CHANNEL_LIST', {
          listType: listType,
          channels: channels,
        });
        resolve(channels);
      },
    });
  });
}

export function addStar(context, channelID) {
  let channel = context.getters.getChannel(channelID);
  channel.STARRING = true;
  $.ajax({
    method: 'POST',
    data: JSON.stringify({
      channel_id: channelID,
      user_id: State.current_user.id,
    }),
    url: window.Urls.add_bookmark(),
    success: () => {
      channel.STARRED = true;
      channel.STARRING = false;
    },
  });
}

export function removeStar(context, channelID) {
  let channel = context.getters.getChannel(channelID);
  channel.STARRING = true;
  $.ajax({
    method: 'POST',
    data: JSON.stringify({
      channel_id: channelID,
      user_id: State.current_user.id,
    }),
    url: window.Urls.remove_bookmark(),
    success: () => {
      channel.STARRED = false;
      channel.STARRING = false;
    },
  });
}

/* CHANNEL EDITOR ACTIONS */
export function saveChannel(context) {
  /* TODO: REMOVE BACKBONE */
  return new Promise((resolve, reject) => {
    new Models.ChannelModel().save(context.state.channelChanges, {
      patch: true,
      error: reject,
      success: channel => {
        channel = channel.toJSON();
        context.commit('SUBMIT_CHANNEL', channel);
        context.commit('SET_ACTIVE_CHANNEL', channel.id); // Used for new channels
        resolve(channel);
      },
    });
  });
}

export function deleteChannel(context, channelID) {
  let channel = context.getters.getChannel(channelID);

  /* TODO: REMOVE BACKBONE */
  return new Promise((resolve, reject) => {
    new Models.ChannelModel(channel).save(
      { deleted: true },
      {
        patch: true,
        error: reject,
        success: () => {
          context.commit('REMOVE_CHANNEL', channel.id);
          context.commit('SET_ACTIVE_CHANNEL', null);
          resolve();
        },
      }
    );
  });
}

export function loadNodeDetails(context, nodeID) {
  return new Promise(function(resolve, reject) {
    $.ajax({
      method: 'GET',
      url: window.Urls.get_topic_details(nodeID),
      error: reject,
      success: result => {
        let node = new Models.ContentNodeModel({ metadata: JSON.parse(result) });
        node.id = nodeID;
        resolve(node);
      },
    });
  });
}

export function downloadChannelDetails(context, payload) {
  return new Promise(function(resolve, reject) {
    let url = '';
    switch (payload.format) {
      case 'detailedPdf':
        url = window.Urls.get_channel_details_pdf_endpoint(payload.id);
        break;
      case 'csv':
        url = window.Urls.get_channel_details_csv_endpoint(payload.id);
        break;
      case 'ppt':
        url = window.Urls.get_channel_details_ppt_endpoint(payload.id);
        break;
      default:
        url = window.Urls.get_channel_details_pdf_endpoint(payload.id) + '?condensed=true';
    }
    $.fileDownload(url, {
      successCallback: resolve,
      failCallback: responseHtml => {
        reject(responseHtml);
      },
    });
  });
}

/* CHANNEL SET ACTIONS */
export function loadChannelSetList(context) {
  return new Promise((resolve, reject) => {
    $.ajax({
      method: 'GET',
      url: window.Urls.get_user_channel_sets(),
      error: reject,
      success: channelSets => {
        context.commit('SET_CHANNELSET_LIST', channelSets);
        resolve(channelSets);
      },
    });
  });
}

export function deleteChannelSet(context, channelSetID) {
  /* TODO: REMOVE BACKBONE */
  new Models.ChannelSetModel({ id: channelSetID }).destroy({
    success: function() {
      context.commit('REMOVE_CHANNELSET', channelSetID);
    },
  });
}

/* INVITATION ACTIONS */
export function loadChannelInvitationList(context) {
  return new Promise((resolve, reject) => {
    $.ajax({
      method: 'GET',
      url: window.Urls.get_user_pending_channels(),
      error: reject,
      success: invitations => {
        context.commit('SET_INVITATION_LIST', invitations);
        resolve(invitations);
      },
    });
  });
}

export function acceptInvitation(context, invitationID) {
  let invitation = context.getters.getInvitation(invitationID);
  return new Promise((resolve, reject) => {
    $.ajax({
      method: 'POST',
      url: window.Urls.accept_channel_invite(),
      data: { invitation_id: invitationID },
      error: reject,
      success: channel => {
        prepChannel(channel);
        let listType = ChannelInvitationMapping[invitation.share_mode];
        channel[listType] = true;
        context.commit('ADD_CHANNEL', channel);
        resolve(channel);
      },
    });
  });
}

export function declineInvitation(context, invitationID) {
  /* TODO: REMOVE BACKBONE */
  return new Promise((resolve, reject) => {
    let invite = new Models.InvitationModel({ id: invitationID });
    invite.destroy({ success: resolve, error: reject });
  });
}
