import Vue from 'vue';
import { mount } from '@vue/test-utils';
import Vuetify from 'vuetify';
import store from '../../../store';
import ChannelInvitation from '../ChannelInvitation.vue';

Vue.use(Vuetify);

const invitationID = 'testing';
store.commit('channelList/SET_INVITATION_LIST', [
  {
    id: invitationID,
    channel: {},
  },
]);

function makeWrapper() {
  return mount(ChannelInvitation, {
    store,
    sync: false,
    propsData: {
      invitationID: invitationID,
    },
  });
}

describe('channelInvitation', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('clicking on the accept button should accept the invitation', () => {
    let acceptStub = jest.fn();
    wrapper.setMethods({ acceptInvitation: acceptStub });
    wrapper.find('[data-test="accept"]').trigger('click');
    expect(acceptStub).toHaveBeenCalledWith(invitationID);
  });
  it('clicking on the decline button in dialog should decline the invitation', () => {
    let declineStub = jest.fn();
    wrapper.setMethods({ declineAndClose: declineStub });
    wrapper.find('[data-test="decline"]').trigger('click');
    wrapper.vm.$nextTick(() => {
      wrapper.find('[data-test="decline-close"]').trigger('click');
      expect(declineStub).toHaveBeenCalled();
    });
  });
});
