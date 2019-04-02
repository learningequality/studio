import { mount } from '@vue/test-utils';
import ChannelInvitationItem from './../views/ChannelInvitationItem.vue';
import { localStore, mockFunctions } from './data.js';

function makeWrapper(share_mode) {
  let invitation = {
    id: 'inviteid',
    share_mode: share_mode || 'edit',
    sender: {
      first_name: 'First',
      last_name: 'Last',
    },
  };
  localStore.commit('channel_list/SET_INVITATION_LIST', [invitation]);
  return mount(ChannelInvitationItem, {
    store: localStore,
    propsData: {
      invitationID: invitation.id,
    },
  });
}

describe('channelInvitationItem', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
    mockFunctions.declineInvitation.mockReset();
    mockFunctions.acceptInvitation.mockReset();
  });

  it('clicking ACCEPT button should accept invitation', () => {
    let acceptButton = wrapper.find('.accept-invitation');
    acceptButton.trigger('click');
    expect(mockFunctions.declineInvitation).not.toHaveBeenCalled();
    expect(mockFunctions.acceptInvitation).toHaveBeenCalled();
  });
  it('clicking DECLINE button should decline invitation', () => {
    let declineButton = wrapper.find('.decline-invitation');
    declineButton.trigger('click');
    expect(mockFunctions.acceptInvitation).not.toHaveBeenCalled();
    expect(mockFunctions.declineInvitation).not.toHaveBeenCalled();

    expect(document.querySelector('#dialog-box')).toBeTruthy();
    wrapper.vm.declineInvitation(wrapper.vm.invitation);
    expect(mockFunctions.declineInvitation).toHaveBeenCalled();
  });
  it('clicking X should dismiss invitation', () => {
    expect(localStore.state.channel_list.invitations).toHaveLength(1);
    wrapper.setData({ accepted: true });
    wrapper.find('.remove').trigger('click');
    expect(localStore.state.channel_list.invitations).toHaveLength(0);
  });
});
