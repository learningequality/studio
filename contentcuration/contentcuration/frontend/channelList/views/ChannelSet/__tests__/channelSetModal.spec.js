import Vue from 'vue';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import store from '../../../store';
import router from '../../../router';
import { RouterNames } from '../../../constants';
import ChannelSetModal from '../ChannelSetModal.vue';

Vue.use(Vuetify);
Vue.use(VueRouter);

const channelSetId = 'testing';

function makeWrapper(saveStub, closeStub) {
  router.push({
    name: RouterNames.CHANNEL_SET_DETAILS,
    params: {
      channelSetId: channelSetId,
    },
  });
  let wrapper = mount(ChannelSetModal, {
    router,
    store,
    propsData: {
      channelSetId: channelSetId,
    },
  });
  wrapper.setMethods({
    saveAndClose: saveStub,
    close: closeStub,
  });
  return wrapper;
}

describe('channelSetModal', () => {
  let wrapper;
  let saveStub = jest.fn();
  let closeStub = jest.fn();
  beforeEach(() => {
    saveStub.mockReset();
    closeStub.mockReset();
    wrapper = makeWrapper(saveStub, closeStub);
  });
  it('clicking close should close the modal', () => {
    wrapper.find('[data-test="close"]').trigger('click');
    expect(closeStub).toHaveBeenCalled();
  });
  it('clicking save button should call save method', () => {
    wrapper.find('[data-test="save"]').trigger('click');
    expect(saveStub).toHaveBeenCalled();
  });
  it('clicking select channels button should navigate to channel selection view', () => {
    wrapper.setData({ loadingChannels: false });
    wrapper.find('[data-test="select"]').trigger('click');
    expect(wrapper.vm.step).toBe(2);
  });
  it('clicking finish should navigate back to collection details view', () => {
    wrapper.setData({ loadingChannels: false, step: 2 });
    wrapper.vm.$nextTick(() => {
      wrapper.find('[data-test="finish"]').trigger('click');
      expect(wrapper.vm.step).toBe(1);
    });
  });
});
