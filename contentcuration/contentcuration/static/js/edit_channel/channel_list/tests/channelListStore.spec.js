import _ from 'underscore';
import store from './../vuex/store';
import { ListTypes } from './../constants';
import { Invitations } from './data';

const Backbone = require('backbone');

/*
  TODO: there are some issues trying to mock jquery.ajax as it
  throws a `TypeError: Cannot read property 'prototype' of undefined`
  due to how it interacts with Backbone. Added TODOs where we'll need
  to test
*/

describe('channelListStore', () => {
  let channel;
  beforeEach(() => {
    channel = { id: 'test', name: 'channel', main_tree: 'node' };
    store.commit('channel_list/RESET_STATE');
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('channel actions', () => {
    describe('loadChannelList', () => {
      it('should get list of channels', () => {
        _.each(_.values(ListTypes), type => {
          store.dispatch('channel_list/loadChannelList', type);
          // TODO: make sure ChannelListUrls[type] endpoint is called
        });
      });
      describe('adding channels to the store', () => {
        let channels;
        let payload1;
        let payload2;

        beforeEach(() => {
          store.commit('channel_list/RESET_STATE');
          channels = store.state.channel_list.channels;
          payload1 = {
            listType: ListTypes.EDITABLE,
            channels: [{ id: 'channel 1' }, { id: 'channel 2' }],
          };
          payload2 = {
            listType: ListTypes.VIEW_ONLY,
            channels: [{ id: 'channel 1' }, { id: 'channel 3' }],
          };
        });

        it('should merge the channels to one list', () => {
          store.commit('channel_list/SET_CHANNEL_LIST', payload1);
          expect(channels).toHaveLength(2);
          store.commit('channel_list/SET_CHANNEL_LIST', payload2);
          expect(channels).toHaveLength(3);
        });

        it('should mark relevant list types as true', () => {
          store.commit('channel_list/SET_CHANNEL_LIST', payload1);
          store.commit('channel_list/SET_CHANNEL_LIST', payload2);
          expect(_.find(channels, { [ListTypes.EDITABLE]: true, id: 'channel 1' })).toBeTruthy();
          expect(_.find(channels, { [ListTypes.EDITABLE]: true, id: 'channel 2' })).toBeTruthy();
          expect(_.find(channels, { [ListTypes.EDITABLE]: false, id: 'channel 3' })).toBeTruthy();
          expect(_.find(channels, { [ListTypes.VIEW_ONLY]: true, id: 'channel 1' })).toBeTruthy();
          expect(_.find(channels, { [ListTypes.VIEW_ONLY]: false, id: 'channel 2' })).toBeTruthy();
          expect(_.find(channels, { [ListTypes.VIEW_ONLY]: true, id: 'channel 3' })).toBeTruthy();
        });
      });
    });

    describe('star actions', () => {
      it('addStar should post a star request', () => {
        // store.dispatch('channel_list/addStar', channel)
        // TODO: add_bookmark endpoint should be called
      });
      it('removeStar should post a star request', () => {
        // store.dispatch('channel_list/removeStar', channel)
        // TODO: remove_bookmark endpoint should be called
      });
    });
    describe('channel edit actions', () => {
      beforeEach(() => {
        store.commit('channel_list/RESET_STATE');
        store.commit('channel_list/ADD_CHANNEL', channel);
        store.commit('channel_list/SET_ACTIVE_CHANNEL', channel.id);
      });

      it('saveChannel should save changes', () => {
        store.commit('channel_list/SET_CHANNEL_NAME', 'new name');
        store.dispatch('channel_list/saveChannel').then(() => {
          // TODO: Need to mock endpoint to get rid of UnhandledPromiseRejectionWarning
          // Needs to be patch as post will overwrite editors
          expect(Backbone.sync.mock.calls[0][0]).toEqual('patch');
          expect(Backbone.sync.mock.calls[0][1].attributes.name).toEqual('new name');
          expect(store.state.channel_list.changed).toBe(false);
          expect(store.state.channel_list.activeChannel.id).toBe('test');
        });
      });

      it('deleteChannel should mark channel.deleted as true', () => {
        store.commit('channel_list/SET_CHANNELSET_LIST', [
          { id: 'channelset', channels: ['test'] },
        ]);
        store.dispatch('channel_list/deleteChannel', channel.id).then(() => {
          expect(Backbone.sync.mock.calls[0][1].attributes.deleted).toBe(true);
          expect(_.find(store.state.channel_list.channels, { id: 'test' })).toBeFalsy();
          expect(store.state.channel_list.channelSets[0].channels).toHaveLength(0);
        });
      });
    });

    it('loadNodeDetails should generate channel details', () => {
      // store.dispatch('channel_list/loadNodeDetails', channel.main_tree);
      // TODO: get_topic_details endpoint should be called
    });

    it('should start pdf download', () => {
      // store.dispatch('channel_list/downloadChannelDetails', {id: 'test', format: 'detailedPDF'});
      // TODO: make sure get_channel_details_pdf_endpoint endpoint is called
      // store.dispatch('channel_list/downloadChannelDetails', {id: 'test', format: 'pdf'});
      // TODO: make sure get_channel_details_pdf_endpoint endpoint is called
      // store.dispatch('channel_list/downloadChannelDetails', {id: 'test', format: 'csv'});
      // TODO: make sure get_channel_details_csv_endpoint endpoint is called
      // store.dispatch('channel_list/downloadChannelDetails', {id: 'test', format: 'ppt'});
      // TODO: make sure get_channel_details_ppt_endpoint endpoint is called
    });
  });

  describe('channel set actions', () => {
    beforeEach(() => {});
    it('loadChannelSetList should get list of channel sets', () => {
      // store.dispatch('channel_list/loadChannelSetList');
      // TODO: get_user_channel_sets endpoint should be called
    });
    it('deleteChannelSet should delete the channel set', () => {
      let channelSet = { id: 'test' };
      store.commit('channel_list/SET_CHANNELSET_LIST', [channelSet]);
      store.dispatch('channel_list/deleteChannelSet', channelSet.id).then(() => {
        expect(Backbone.sync.mock.calls[0][0]).toEqual('delete');
        expect(Backbone.sync.mock.calls[0][1].attributes.id).toEqual(channelSet.id);
        expect(_.find(store.state.channel_list.channelSets, { id: channelSet.id })).toBeFalsy();
      });
    });
  });

  describe('invitation actions', () => {
    beforeEach(() => {
      store.commit('channel_list/RESET_STATE');
    });
    it('loadChannelInvitationList should get list of invitations', () => {
      // store.dispatch('channel_list/loadChannelInvitationList');
      // TODO: get_user_pending_channels endpoint should be called
    });
    it('acceptInvitation should accept the invitation', () => {
      // _.each(Invitations, (invitation) => {
      //   store.dispatch('channel_list/acceptInvitation', invitation).then(() => {
      // TODO: accept_channel_invite endpoint should be called
      // TODO: Make sure proper edit/view access is given
      // TODO: Make sure channels are added to correct lists
      //     jest.clearAllMocks();
      //   });
      // });
    });

    it('declineInvitation should decline the invitation', () => {
      _.each(Invitations, invitation => {
        store.commit('channel_list/SET_INVITATION_LIST', [invitation]);
        store.dispatch('channel_list/declineInvitation', invitation.id).then(() => {
          // TODO: Need to mock endpoint to get rid of UnhandledPromiseRejectionWarning
          expect(Backbone.sync.mock.calls[0][0]).toEqual('delete');
          expect(Backbone.sync.mock.calls[0][1].attributes.id).toEqual(invitation.id);
          jest.clearAllMocks();
        });
      });
    });
  });
});
