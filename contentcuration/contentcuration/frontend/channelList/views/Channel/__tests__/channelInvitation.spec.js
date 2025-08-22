import { mount } from '@vue/test-utils';
import ChannelInvitation from '../ChannelInvitation.vue';
import { factory } from '../../../store';

const store = factory();
const invitationID = 'testing';

function makeWrapper() {
  return mount(ChannelInvitation, {
    store,
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

  it('clicking on the accept button should accept the invitation', async () => {
    const acceptInvitation = jest.spyOn(wrapper.vm, 'acceptInvitation');
    acceptInvitation.mockImplementation(() => Promise.resolve());
    await wrapper.find('[data-test="accept"]').trigger('click');
    expect(acceptInvitation).toHaveBeenCalledWith(invitationID);
  });

  it('clicking on the decline button should open confirmation modal', async () => {
    await wrapper.find('[data-test="decline"]').trigger('click');
    expect(wrapper.vm.dialog).toBe(true);
  });

  it('clicking on the decline button should decline the invitation', async () => {
    const declineInvitation = jest.spyOn(wrapper.vm, 'declineInvitation');
    declineInvitation.mockImplementation(() => Promise.resolve());
    await wrapper.find('[data-test="decline-close"]').trigger('click');
    expect(declineInvitation).toHaveBeenCalledWith(invitationID);
  });
});
