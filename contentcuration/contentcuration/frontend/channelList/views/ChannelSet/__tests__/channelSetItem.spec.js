import Vue from 'vue';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import store from '../../../store';
import router from '../../../router';
import { RouterNames } from '../../../constants';
import ChannelSetItem from '../ChannelSetItem.vue';

Vue.use(VueRouter);
const channelSet = {
  id: 'testing',
  channels: [],
  secret_token: '1234567890',
};

function makeWrapper(deleteStub) {
  const wrapper = mount(ChannelSetItem, {
    router,
    store,
    sync: false,
    propsData: { channelSet },
  });
  wrapper.setMethods({
    deleteChannelSet: deleteStub,
  });
  return wrapper;
}

describe('channelSetItem', () => {
  let wrapper;
  let deleteStub = jest.fn();
  beforeEach(() => {
    deleteStub.mockReset();
    wrapper = makeWrapper(deleteStub);
  });
  it('clicking the edit option should open the channel set edit modal', () => {
    wrapper.find('[data-test="edit"]').trigger('click');
    expect(wrapper.vm.$route.name).toEqual(RouterNames.CHANNEL_SET_DETAILS);
  });
  it('clicking delete button in dialog should delete the channel set', () => {
    wrapper.vm.deleteDialog = true;
    wrapper.find('[data-test="delete"]').trigger('click');
    expect(deleteStub).toHaveBeenCalled();
  });
});
