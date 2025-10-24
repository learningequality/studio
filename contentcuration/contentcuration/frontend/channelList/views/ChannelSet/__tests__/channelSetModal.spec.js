import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import cloneDeep from 'lodash/cloneDeep';
import flushPromises from 'flush-promises';

import { RouteNames } from '../../../constants';
import router from '../../../router';
import channelSet from '../../../vuex/channelSet';
import ChannelSetModal from '../ChannelSetModal';
import channel from 'shared/vuex/channel';
import storeFactory from 'shared/vuex/baseStore';

jest.mock('kolibri-design-system/lib/composables/useKShow', () => ({
  __esModule: true,
  default: () => ({
    show: () => false, // skip loading state
  }),
}));

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

const STORE_CONFIG = {
  modules: { channel, channelSet },
};

const CHANNEL_1 = {
  id: 'id-channel-1',
  name: 'Channel 1',
  description: 'First channel description',
};
const CHANNEL_2 = {
  id: 'id-channel-2',
  name: 'Channel 2',
  description: 'Second channel description',
};

const CHANNEL_SET = {
  id: 'id-channel-set',
  channels: {
    [CHANNEL_1.id]: true,
    [CHANNEL_2.id]: true,
  },
};

const makeWrapper = ({ store, channelSetId }) => {
  if (router.currentRoute.name !== RouteNames.CHANNEL_SET_DETAILS) {
    router.push({
      name: RouteNames.CHANNEL_SET_DETAILS,
      params: {
        channelSetId,
      },
    });
  }

  const loadChannelSet = jest.spyOn(ChannelSetModal.methods, 'loadChannelSet');
  loadChannelSet.mockImplementation(() => {
    store.commit('channelSet/ADD_CHANNELSET', CHANNEL_SET);
    return Promise.resolve(CHANNEL_SET);
  });
  const loadChannelList = jest.spyOn(ChannelSetModal.methods, 'loadChannelList');
  loadChannelList.mockImplementation(() => Promise.resolve(CHANNEL_SET.channels));

  const wrapper = mount(ChannelSetModal, {
    propsData: {
      channelSetId,
    },
    router,
    localVue,
    store,
  });
  return [wrapper, { loadChannelSet, loadChannelList }];
};

const getCollectionNameInput = wrapper => {
  return wrapper.findComponent('[data-test="input-name"]');
};

const getUnsavedDialog = wrapper => {
  return wrapper.findComponent('[data-test="dialog-unsaved"]');
};

const getCloseButton = wrapper => {
  return wrapper.findComponent('[data-test="close"]');
};

const getSaveButton = wrapper => {
  return wrapper.findComponent('[data-test="button-save"]');
};

const getSelectChannelsButton = wrapper => {
  return wrapper.findComponent('[data-test="button-select"]');
};

const getFinishButton = wrapper => {
  return wrapper.findComponent('[data-test="button-finish"]');
};

describe('ChannelSetModal', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should show collection channels view at first', () => {
    const storeConfig = cloneDeep(STORE_CONFIG);
    const store = storeFactory(storeConfig);
    const [wrapper] = makeWrapper({ store, channelSetId: CHANNEL_SET.id });

    expect(wrapper.find('[data-test="collection-channels-view"]').isVisible()).toBe(true);
  });

  describe('if there are no data for a channel set yet', () => {
    let mocks;

    beforeEach(() => {
      const storeConfig = cloneDeep(STORE_CONFIG);
      const store = storeFactory(storeConfig);

      mocks = makeWrapper({ store, channelSetId: CHANNEL_SET.id })[1];
    });

    it('should load the channel set', () => {
      expect(mocks.loadChannelSet).toHaveBeenCalledTimes(1);
      expect(mocks.loadChannelSet.mock.calls[0][0]).toBe(CHANNEL_SET.id);
    });

    it('should load channels of the channel set', () => {
      expect(mocks.loadChannelList).toHaveBeenCalledTimes(1);
      expect(mocks.loadChannelList.mock.calls[0][0]).toEqual({
        id__in: [CHANNEL_1.id, CHANNEL_2.id],
      });
    });
  });

  describe('if a channel set has been already loaded', () => {
    let store, mocks;

    beforeEach(() => {
      const storeConfig = cloneDeep(STORE_CONFIG);
      store = storeFactory(storeConfig);
      store.commit('channelSet/ADD_CHANNELSET', CHANNEL_SET);

      mocks = makeWrapper({ store, channelSetId: CHANNEL_SET.id })[1];
    });

    it("shouldn't load the channel set", () => {
      expect(mocks.loadChannelSet).not.toHaveBeenCalled();
    });

    it('should load channels from the channel set', () => {
      expect(mocks.loadChannelList).toHaveBeenCalledTimes(1);
      expect(mocks.loadChannelList.mock.calls[0][0]).toEqual({
        id__in: [CHANNEL_1.id, CHANNEL_2.id],
      });
    });
  });

  describe('collection channels view', () => {
    let wrapper, updateChannelSet;

    beforeEach(() => {
      const storeConfig = cloneDeep(STORE_CONFIG);
      updateChannelSet = jest.fn();
      storeConfig.modules.channel.actions.loadChannelList = jest.fn().mockResolvedValue();
      storeConfig.modules.channelSet.actions.updateChannelSet = updateChannelSet;
      const store = storeFactory(storeConfig);
      store.commit('channelSet/ADD_CHANNELSET', CHANNEL_SET);
      store.commit('channel/ADD_CHANNELS', [CHANNEL_1, CHANNEL_2]);

      [wrapper] = makeWrapper({ store, channelSetId: CHANNEL_SET.id });
    });

    it('should render a collection name input', () => {
      expect(getCollectionNameInput(wrapper).isVisible()).toBe(true);
    });

    it('should render select channels button', () => {
      expect(getSelectChannelsButton(wrapper).isVisible()).toBe(true);
    });

    it('should render save button', () => {
      expect(getSaveButton(wrapper).isVisible()).toBe(true);
    });

    it('should render close button', () => {
      expect(getCloseButton(wrapper).isVisible()).toBe(true);
    });

    it('should render a correct channels count', () => {
      expect(wrapper.findComponent('.subheading').html()).toContain('2 channels');
    });

    it("should render channels' names, descriptions and remove buttons", () => {
      const channelItems = wrapper.findAllComponents({ name: 'ChannelItem' });

      expect(channelItems.length).toBe(2);

      expect(channelItems.at(0).html()).toContain('Channel 1');
      expect(channelItems.at(0).html()).toContain('First channel description');
      expect(channelItems.at(0).find('button').text()).toBe('Remove');

      expect(channelItems.at(1).html()).toContain('Channel 2');
      expect(channelItems.at(1).html()).toContain('Second channel description');
      expect(channelItems.at(1).find('button').text()).toBe('Remove');
    });

    it('clicking select channels button should navigate to channels selection view', async () => {
      await getSelectChannelsButton(wrapper).trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent('[data-test="collection-channels-view"]').isVisible()).toBe(
        false,
      );
      expect(wrapper.findComponent('[data-test="channels-selection-view"]').isVisible()).toBe(true);
    });

    describe('clicking close button', () => {
      it('should redirect to channel sets page', async () => {
        await getCloseButton(wrapper).trigger('click');

        expect(wrapper.vm.$route.name).toBe(RouteNames.CHANNEL_SETS);
      });

      it('should prompt user if there are unsaved changes', async () => {
        expect(getUnsavedDialog(wrapper).exists()).toBeFalsy();

        await wrapper.setData({ name: 'My collection' });
        await getCloseButton(wrapper).trigger('click');

        expect(getUnsavedDialog(wrapper).exists()).toBeTruthy();
      });
    });

    describe('clicking save button', () => {
      it("shouldn't update a channel set when a collection name is missing", async () => {
        await wrapper.setData({ name: '' });
        await getSaveButton(wrapper).trigger('click');
        await flushPromises();

        expect(updateChannelSet).not.toHaveBeenCalled();
      });

      it("shouldn't update a channel set when a collection name is made of empty characters", async () => {
        await wrapper.setData({ name: ' ' });
        await getSaveButton(wrapper).trigger('click');
        await flushPromises();

        expect(updateChannelSet).not.toHaveBeenCalled();
      });

      it('should update a channel set when a collection name is valid', async () => {
        await wrapper.setData({ name: 'My collection' });
        await getSaveButton(wrapper).trigger('click');
        await flushPromises();

        expect(updateChannelSet).toHaveBeenCalledTimes(1);
        expect(updateChannelSet.mock.calls[0][1]).toEqual({
          id: CHANNEL_SET.id,
          name: 'My collection',
        });
      });
    });
  });

  describe('channels selection view', () => {
    let wrapper;

    beforeEach(async () => {
      const storeConfig = cloneDeep(STORE_CONFIG);
      storeConfig.modules.channel.actions.loadChannelList = jest.fn().mockResolvedValue();
      const store = storeFactory(storeConfig);
      store.commit('channelSet/ADD_CHANNELSET', CHANNEL_SET);
      store.commit('channel/ADD_CHANNELS', [CHANNEL_1, CHANNEL_2]);

      [wrapper] = makeWrapper({ store, channelSetId: CHANNEL_SET.id });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      await getSelectChannelsButton(wrapper).trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent('[data-test="channels-selection-view"]').isVisible()).toBe(true);
    });

    it('should render finish button', async () => {
      expect(wrapper.vm.step).toBe(2);
      expect(getFinishButton(wrapper).isVisible()).toBe(true);
    });

    it('clicking finish button should navigate back to collection channels view', async () => {
      await getFinishButton(wrapper).trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.findComponent('[data-test="channels-selection-view"]').isVisible()).toBe(
        false,
      );
      expect(wrapper.findComponent('[data-test="collection-channels-view"]').isVisible()).toBe(
        true,
      );
    });
  });
});
