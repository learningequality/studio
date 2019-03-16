import { mount } from '@vue/test-utils';
import InvitationItem from './../../views/InvitationItem.vue';
import { localStore, mockFunctions } from './../data.js';
import { Permissions } from './../../constants';
import _ from 'underscore';

function makeWrapper(share_mode) {
  let invitation = {
    "id": "inviteid",
    "share_mode": share_mode,
    "sender": {
      "first_name": "First",
      "last_name": "Last"
    }
  };
  return mount(InvitationItem, {
    store: localStore,
    propsData: {
      model: invitation
    }
  })
}

describe('shareInvitationItem', () => {
  let wrappers = [];
  beforeEach(() => {
    _.each(_.values(Permissions), (permission) => {
      wrappers.push(makeWrapper(permission));
    });
  });

  it('access icon should reflect invitation share_mode', () => {
    _.each(wrappers, (wrapper) => {
      let accessIcon = wrapper.find('.access-icon');
      expect(accessIcon.classes()).toContain(wrapper.vm.model.share_mode)
    })
  });

  it('clicking resend button should resend invitation', () => {
    _.each(wrappers, (wrapper) => {
      mockFunctions.sendInvitation.mockReset();
      mockFunctions.deleteInvitation.mockReset();
      let reinviteButton = wrapper.find('.reinvite');
      reinviteButton.trigger('click');

      // Dialog should pop up
      expect(document.querySelector('#dialog-box')).toBeTruthy();
      expect(mockFunctions.sendInvitation).not.toHaveBeenCalled();
      expect(mockFunctions.deleteInvitation).not.toHaveBeenCalled();

      // Check direct function call
      wrapper.vm.handleSendInvitation();
      expect(mockFunctions.sendInvitation).toHaveBeenCalled();
      expect(mockFunctions.deleteInvitation).not.toHaveBeenCalled();
    })
  });

  it('clicking remove button should remove invitation', () => {
    _.each(wrappers, (wrapper) => {
      mockFunctions.sendInvitation.mockReset();
      mockFunctions.deleteInvitation.mockReset();
      let reinviteButton = wrapper.find('.remove');
      reinviteButton.trigger('click');

      // Dialog should pop up
      expect(document.querySelector('#dialog-box')).toBeTruthy();
      expect(mockFunctions.sendInvitation).not.toHaveBeenCalled();
      expect(mockFunctions.deleteInvitation).not.toHaveBeenCalled();

      // Check direct function call
      wrapper.vm.deleteInvitation(wrapper.vm.model);
      expect(mockFunctions.deleteInvitation).toHaveBeenCalled();
      expect(mockFunctions.sendInvitation).not.toHaveBeenCalled();
    })
  });
});
