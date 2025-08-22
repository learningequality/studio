import { mount } from '@vue/test-utils';
import { factory } from '../../../store';
import router from '../../../router';
import { RouteNames } from '../../../constants';
import ChannelItem from '../ChannelItem.vue';

const store = factory();

const channelId = 'testing';
const channel = {
  id: channelId,
  edit: true,
  published: true,
  last_published: new Date().getTime() - 100000,
  modified: new Date().getTime() - 100000,
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
  const deleteSpy = jest.spyOn(wrapper.vm, 'deleteChannel');
  if (deleteStub) {
    deleteSpy.mockImplementation(deleteStub);
  } else {
    deleteSpy.mockImplementation(() => {});
  }
  return wrapper;
}

describe('channelItem', () => {
  let wrapper;
  const deleteStub = jest.fn();

  beforeEach(() => {
    deleteStub.mockReset();
    wrapper = makeWrapper(true, deleteStub);
  });

  afterEach(async () => {
    // Delete dialog and token dialog use primary modal component, so
    // leaving either to be true will block subsequent modals from opening
    await wrapper.setData({ deleteDialog: false, tokenDialog: false });
  });

  it('edit options should be hidden if edit mode is off', () => {
    wrapper = makeWrapper(false, deleteStub);
    expect(wrapper.findComponent('[data-test="edit-channel"]').exists()).toBe(false);
  });

  it('clicking the channel should open the channel', async () => {
    await wrapper.findComponent('[data-test="channel-card"]').trigger('click');
    expect(wrapper.vm.$route.name).toEqual(RouteNames.CHANNELS_EDITABLE);
  });

  it('clicking edit channel should open a channel editor modal', async () => {
    await wrapper.findComponent('[data-test="edit-channel"]').trigger('click');
    expect(wrapper.vm.$route.name).toEqual(RouteNames.CHANNEL_EDIT);
  });

  it('clicking the info icon should open a channel details modal ', async () => {
    await wrapper.findComponent('[data-test="details-button"]').trigger('click');
    expect(wrapper.vm.$route.name).toEqual(RouteNames.CHANNEL_DETAILS);
  });

  it('clicking the token option should open the token modal', async () => {
    await wrapper.findComponent('[data-test="token-listitem"]').trigger('click');
    expect(wrapper.vm.tokenDialog).toBe(true);
  });

  it('when user can edit, clicking delete button in dialog should call deleteChannel', async () => {
    const removeViewerSpy = jest.spyOn(wrapper.vm, 'removeViewer');
    removeViewerSpy.mockResolvedValue();

    await wrapper.setData({ deleteDialog: true });
    await wrapper.findComponent('[data-test="delete-modal"]').trigger('submit');
    await wrapper.vm.$nextTick(() => {
      expect(deleteStub).toHaveBeenCalledWith(channelId);
      expect(removeViewerSpy).not.toHaveBeenCalled();
    });
  });

  it('when user cannot edit, clicking delete button in dialog should call removeViewer', async () => {
    const removeViewerSpy = jest.spyOn(wrapper.vm, 'removeViewer');
    removeViewerSpy.mockResolvedValue();

    await wrapper.setData({ deleteDialog: true });
    await wrapper.findComponent('[data-test="delete-modal"]').trigger('submit');
    await wrapper.vm.$nextTick(() => {
      expect(removeViewerSpy).toHaveBeenCalledWith({ channelId, userId: 0 });
      expect(deleteStub).not.toHaveBeenCalled();
    });
  });

  describe('library mode', () => {
    beforeEach(() => {
      wrapper = makeWrapper(false, null, true);
    });

    it('clicking channel card should open details modal', async () => {
      await wrapper.findComponent('[data-test="channel-card"]').trigger('click');
      expect(wrapper.vm.$route.name).toEqual(RouteNames.CHANNEL_DETAILS);
    });

    it('clicking the token button should open the token modal', async () => {
      await wrapper.setData({ tokenDialog: false });
      await wrapper.findComponent('[data-test="token-button"]').trigger('click');
      expect(wrapper.vm.tokenDialog).toBe(true);
    });

    it('certain menu options should be hidden', () => {
      expect(wrapper.findComponent('[data-test="edit-channel"]').exists()).toBe(false);
      expect(wrapper.findComponent('[data-test="delete-channel"]').exists()).toBe(false);
      expect(wrapper.findComponent('[data-test="token-listitem"]').exists()).toBe(false);
      expect(wrapper.findComponent('[data-test="details-button"]').exists()).toBe(false);
    });
  });
});
