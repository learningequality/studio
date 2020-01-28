import Vue from 'vue';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import store from '../../../store';
import router from '../../../router';
import { RouterNames } from '../../../constants';
import ChannelItem from '../ChannelItem.vue';

Vue.use(VueRouter);
const channelId = 'testing';

store.state.session.loggedIn = true;
store.commit('channelList/ADD_CHANNEL', {
  id: channelId,
  edit: true,
});

function makeWrapper(allowEdit, deleteStub) {
  const wrapper = mount(ChannelItem, {
    router,
    store,
    propsData: {
      channelId: channelId,
      allowEdit: allowEdit,
    },
  });
  wrapper.setMethods({
    handleDelete: deleteStub,
  });
  return wrapper;
}

describe('channelItem', () => {
  let wrapper;
  let deleteStub = jest.fn();
  beforeEach(() => {
    deleteStub.mockReset();
    wrapper = makeWrapper(true, deleteStub);
  });
  it('edit options should be hidden if edit mode is off', () => {
    wrapper = makeWrapper(false, deleteStub);
    expect(wrapper.find('[data-test="edit-channel"]').exists()).toBe(false);
  });
  it('clicking the channel should open the channel', () => {
    wrapper.find('[data-test="channel-card"]').trigger('click');
    expect(wrapper.vm.$route.name).toEqual(RouterNames.CHANNELS);
  });
  it('clicking edit channel should open a channel editor modal', () => {
    wrapper.find('[data-test="edit-channel"]').trigger('click');
    expect(wrapper.vm.$route.name).toEqual(RouterNames.CHANNEL_EDIT);
  });
  it('clicking the info icon should open a channel details modal ', () => {
    wrapper.find('[data-test="details-button"]').trigger('click');
    expect(wrapper.vm.$route.name).toEqual(RouterNames.CHANNEL_DETAILS);
  });
  it('clicking delete button in dialog should delete the channel', () => {
    wrapper.vm.deleteDialog = true;
    wrapper.find('[data-test="delete"]').trigger('click');
    expect(deleteStub).toHaveBeenCalled();
  });
});
