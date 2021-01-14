import Vue from 'vue';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import { factory } from '../../../store';
import router from '../../../router';
import { RouterNames } from '../../../constants';
import ChannelItem from '../ChannelItem.vue';

const store = factory();

Vue.use(VueRouter);
const channelId = 'testing';
const channel = {
  id: channelId,
  edit: true,
  published: true,
};

store.state.session.currentUser.id = 0;

function makeWrapper(allowEdit, deleteStub, libraryMode) {
  const wrapper = mount(ChannelItem, {
    router,
    store,
    propsData: {
      channelId: channelId,
      allowEdit: allowEdit,
    },
    computed: {
      libraryMode() {
        return libraryMode;
      },
      channel() {
        return channel;
      },
      $themeTokens() {
        return {};
      },
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
  afterEach(() => {
    // Delete dialog and token dialog use primary modal component, so
    // leaving either to be true will block subsequent modals from opening
    wrapper.setData({ deleteDialog: false, tokenDialog: false });
  });
  it('edit options should be hidden if edit mode is off', () => {
    wrapper = makeWrapper(false, deleteStub);
    expect(wrapper.find('[data-test="edit-channel"]').exists()).toBe(false);
  });
  it('clicking the channel should open the channel', () => {
    wrapper.find('[data-test="channel-card"]').trigger('click');
    expect(wrapper.vm.$route.name).toEqual(RouterNames.CHANNELS_EDITABLE);
  });
  it('clicking edit channel should open a channel editor modal', () => {
    wrapper.find('[data-test="edit-channel"]').trigger('click');
    expect(wrapper.vm.$route.name).toEqual(RouterNames.CHANNEL_EDIT);
  });
  it('clicking the info icon should open a channel details modal ', () => {
    wrapper.find('[data-test="details-button"]').trigger('click');
    expect(wrapper.vm.$route.name).toEqual(RouterNames.CHANNEL_DETAILS);
  });
  it('clicking the token option should open the token modal', () => {
    wrapper.find('[data-test="token-listitem"]').trigger('click');
    expect(wrapper.vm.tokenDialog).toBe(true);
  });
  it('clicking delete button in dialog should delete the channel', () => {
    wrapper.setData({ deleteDialog: true });
    wrapper.find('[data-test="delete"]').trigger('click');
    wrapper.vm.$nextTick(() => {
      expect(deleteStub).toHaveBeenCalled();
    });
  });

  describe('library mode', () => {
    beforeEach(() => {
      wrapper = makeWrapper(false, null, true);
    });
    it('clicking channel card should open details modal', () => {
      wrapper.find('[data-test="channel-card"]').trigger('click');
      expect(wrapper.vm.$route.name).toEqual(RouterNames.CHANNEL_DETAILS);
    });
    it('clicking the token button should open the token modal', () => {
      wrapper.setData({ tokenDialog: false });
      wrapper.find('[data-test="token-button"]').trigger('click');
      expect(wrapper.vm.tokenDialog).toBe(true);
    });
    it('certain menu options should be hidden', () => {
      expect(wrapper.find('[data-test="edit-channel"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="delete-channel"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="token-listitem"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="details-button"]').exists()).toBe(false);
    });
  });
});
