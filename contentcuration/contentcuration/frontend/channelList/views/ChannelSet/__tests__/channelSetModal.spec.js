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

const loadChannelSetMock = (cs, store) => {
  return jest.fn().mockImplementation(() => {
    store.commit('channelSet/ADD_CHANNELSET', cs);
    return Promise.resolve(cs);
  });
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

  const loadChannelSet = loadChannelSetMock(CHANNEL_SET, store);
  const loadChannelList = jest.fn().mockImplementation(() => Promise.resolve(CHANNEL_SET.channels));

  const wrapper = mount(ChannelSetModal, {
    propsData: {
      channelSetId,
    },
    methods: {
      loadChannelSet,
      loadChannelList,
    },
    router,
    localVue,
    store,
  });
  wrapper.loadChannelSet = loadChannelSet;
  wrapper.loadChannelList = loadChannelList;
  return wrapper;
};

const getCollectionNameInput = wrapper => {
  return wrapper.find('[data-test="input-name"]');
};

const getUnsavedDialog = wrapper => {
  return wrapper.find('[data-test="dialog-unsaved"]');
};

const getCloseButton = wrapper => {
  return wrapper.find('[data-test="close"]');
};

const getSaveButton = wrapper => {
  return wrapper.find('[data-test="button-save"]');
};

const getSelectChannelsButton = wrapper => {
  return wrapper.find('[data-test="button-select"]');
};

const getFinishButton = wrapper => {
  return wrapper.find('[data-test="button-finish"]');
};

describe('ChannelSetModal', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should show collection channels view at first', () => {
    const storeConfig = cloneDeep(STORE_CONFIG);
    const store = storeFactory(storeConfig);
    const wrapper = makeWrapper({ store, channelSetId: CHANNEL_SET.id });

    expect(wrapper.find('[data-test="collection-channels-view"]').isVisible()).toBe(true);
  });

  describe('if there are no data for a channel set yet', () => {
    let wrapper;
    beforeEach(() => {
      const storeConfig = cloneDeep(STORE_CONFIG);
      const store = storeFactory(storeConfig);

      wrapper = makeWrapper({ store, channelSetId: CHANNEL_SET.id });
    });

    it('should load the channel set', () => {
      expect(wrapper.loadChannelSet).toHaveBeenCalledTimes(1);
      expect(wrapper.loadChannelSet.mock.calls[0][0]).toBe(CHANNEL_SET.id);
    });

    it('should load channels of the channel set', () => {
      expect(wrapper.loadChannelList).toHaveBeenCalledTimes(1);
      expect(wrapper.loadChannelList.mock.calls[0][0]).toEqual({
        id__in: [CHANNEL_1.id, CHANNEL_2.id],
      });
    });
  });

  describe('if a channel set has been already loaded', () => {
    let store, wrapper;

    beforeEach(() => {
      const storeConfig = cloneDeep(STORE_CONFIG);
      store = storeFactory(storeConfig);
      store.commit('channelSet/ADD_CHANNELSET', CHANNEL_SET);

      wrapper = makeWrapper({ store, channelSetId: CHANNEL_SET.id });
    });

    it("shouldn't load the channel set", () => {
      expect(wrapper.loadChannelSet).not.toHaveBeenCalled();
    });

    it('should load channels from the channel set', () => {
      expect(wrapper.loadChannelList).toHaveBeenCalledTimes(1);
      expect(wrapper.loadChannelList.mock.calls[0][0]).toEqual({
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

      wrapper = makeWrapper({ store, channelSetId: CHANNEL_SET.id });
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
      expect(wrapper.find('.subheading').html()).toContain('2 channels');
    });

    it("should render channels' names, descriptions and remove buttons", () => {
      const channelItems = wrapper.findAll({ name: 'ChannelItem' });

      expect(channelItems.length).toBe(2);

      expect(channelItems.at(0).html()).toContain('Channel 1');
      expect(channelItems.at(0).html()).toContain('First channel description');
      expect(channelItems.at(0).find('button').text()).toBe('Remove');

      expect(channelItems.at(1).html()).toContain('Channel 2');
      expect(channelItems.at(1).html()).toContain('Second channel description');
      expect(channelItems.at(1).find('button').text()).toBe('Remove');
    });

    it('clicking select channels button should navigate to channels selection view', async () => {
      getSelectChannelsButton(wrapper).trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-test="collection-channels-view"]').isVisible()).toBe(false);
      expect(wrapper.find('[data-test="channels-selection-view"]').isVisible()).toBe(true);
    });

    describe('clicking close button', () => {
      it('should redirect to channel sets page', () => {
        getCloseButton(wrapper).trigger('click');

        expect(wrapper.vm.$route.name).toBe(RouteNames.CHANNEL_SETS);
      });

      it('should prompt user if there are unsaved changes', () => {
        expect(getUnsavedDialog(wrapper).attributes('data-test-visible')).toBeFalsy();

        getCollectionNameInput(wrapper).setValue('My collection');
        getCloseButton(wrapper).trigger('click');

        expect(getUnsavedDialog(wrapper).attributes('data-test-visible')).toBeTruthy();
      });
    });

    describe('clicking save button', () => {
      it("shouldn't update a channel set when a collection name is missing", async () => {
        getCollectionNameInput(wrapper).setValue('');
        getSaveButton(wrapper).trigger('click');
        await flushPromises();

        expect(updateChannelSet).not.toHaveBeenCalled();
      });

      it("shouldn't update a channel set when a collection name is made of empty characters", async () => {
        getCollectionNameInput(wrapper).setValue(' ');
        getSaveButton(wrapper).trigger('click');
        await flushPromises();

        expect(updateChannelSet).not.toHaveBeenCalled();
      });

      it('should update a channel set when a collection name is valid', async () => {
        getCollectionNameInput(wrapper).setValue('My collection');
        getSaveButton(wrapper).trigger('click');
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

      wrapper = makeWrapper({ store, channelSetId: CHANNEL_SET.id });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      getSelectChannelsButton(wrapper).trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-test="channels-selection-view"]').isVisible()).toBe(true);
    });

    it('should render finish button', () => {
      expect(getFinishButton(wrapper).isVisible()).toBe(true);
    });

    it('clicking finish button should navigate back to collection channels view', async () => {
      getFinishButton(wrapper).trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-test="channels-selection-view"]').isVisible()).toBe(false);
      expect(wrapper.find('[data-test="collection-channels-view"]').isVisible()).toBe(true);
    });
  });
});
