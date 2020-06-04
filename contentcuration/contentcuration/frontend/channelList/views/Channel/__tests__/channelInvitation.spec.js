import { mount } from '@vue/test-utils';
import ChannelInvitation from '../ChannelInvitation.vue';

const invitationID = 'testing';

function makeWrapper() {
  return mount(ChannelInvitation, {
    propsData: {
      invitationID,
    },
    computed: {
      invitation() {
        return {
          id: invitationID,
          channel: {},
        };
      },
    },
  });
}

describe('channelInvitation', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('clicking on the accept button should accept the invitation', () => {
    const acceptInvitation = jest.fn().mockReturnValue(Promise.resolve());
    wrapper.setMethods({ acceptInvitation });
    wrapper.find('[data-test="accept"]').trigger('click');
    expect(acceptInvitation).toHaveBeenCalledWith(invitationID);
  });
  it('clicking on the decline button should open confirmation modal', () => {
    wrapper.find('[data-test="decline"]').trigger('click');
    expect(wrapper.vm.dialog).toBe(true);
  });
  it('clicking on the decline button should decline the invitation', () => {
    const declineInvitation = jest.fn().mockReturnValue(Promise.resolve());
    wrapper.setMethods({ declineInvitation });
    wrapper.find('[data-test="decline-close"]').trigger('click');
    expect(declineInvitation).toHaveBeenCalledWith(invitationID);
  });
});
