import { mount } from '@vue/test-utils';
import ChannelStar from './../../views/ChannelStar.vue';
import _ from 'underscore';


describe('channelListStore', () => {

  describe('channel actions', () => {
    describe('setActiveChannel', () => {
      it('should change channel', () => {
        expect(true).toBe(true);
      });
      it('should block channel change if changes are detected', () => {
        expect(true).toBe(true);
      });
    })

    describe('loadChannelList', () => {
      it('should get list of channels', () => {
        // TODO: test all list types
        expect(true).toBe(true);
      });
    })

    describe('star actions', () => {
      it('addStar should post a star request', () => {
        expect(true).toBe(true);
      });
      it('removeStar should post a star request', () => {
        expect(true).toBe(true);
      });
    })

    describe('channel edit actions', () => {
      it('saveChannel should save changes', () => {
        expect(true).toBe(true);
      });
      it('deleteChannel should mark channel.deleted as true', () => {
        expect(true).toBe(true);
        // TODO: test if channel counts on sets are updated too
      });
    })

    it('loadNodeDetails should generate channel details', () => {
      expect(true).toBe(true);
    });

    describe('downloadChannelDetails', () => {
      it('should start pdf download', () => {
        // TODO: test all export types
        expect(true).toBe(true);
      });
    })
  });

  describe('channel set actions', () => {
    it('loadChannelSetList should get list of channel sets', () => {
      expect(true).toBe(true);
    });
    it('deleteChannelSet should delete the channel set', () => {
      expect(true).toBe(true);
    });
  });

  describe('invitation actions', () => {
    it('loadChannelInvitationList should get list of invitations', () => {
      expect(true).toBe(true);
    });
    it('acceptInvitation should accept the invitation', () => {
      expect(true).toBe(true);
      // TODO: Make sure proper edit/view access is given
      // TODO: Make sure channels are added to correct lists
    });
    it('declineInvitation should decline the invitation', () => {
      expect(true).toBe(true);
    });
  });

});
