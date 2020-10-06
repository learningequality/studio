import Vue from 'vue';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import store from '../../../store';
import router from '../../../router';
import { RouterNames } from '../../../constants';
import ChannelSetModal from '../ChannelSetModal.vue';
import { NEW_OBJECT } from 'shared/constants';

jest.mock('shared/data/changes', () => {
  return {
    ChangeTracker: jest.fn().mockImplementation(() => {
      return {
        revert: jest.fn().mockReturnValue(Promise.resolve()),
        start: jest.fn().mockReturnValue(Promise.resolve()),
        dismiss: jest.fn().mockReturnValue(Promise.resolve()),
      };
    }),
  };
});

Vue.use(VueRouter);

const channelSetId = 'testing';

function makeWrapper(setData = {}, methods = {}) {
  router.push({
    name: RouterNames.CHANNEL_SET_DETAILS,
    params: {
      channelSetId,
    },
  });
  if (setData.isNew) {
    delete setData.isNew;
    setData[NEW_OBJECT] = true;
  }
  let wrapper = mount(ChannelSetModal, {
    router,
    store,
    propsData: {
      channelSetId: channelSetId,
    },
    computed: {
      channelSet() {
        return {
          channelSetId,
          ...setData,
        };
      },
    },
    methods: {
      loadChannelSet() {
        return Promise.resolve({ channelSetId });
      },
      ...methods,
    },
  });
  wrapper.vm.setup();
  return wrapper;
}

describe('channelSetModal', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  describe('on load', () => {
    it('should load channels', () => {
      const loadChannelList = jest.fn().mockReturnValue(Promise.resolve());
      wrapper = makeWrapper({ channels: ['mock-channel-id'] }, { loadChannelList });
      expect(loadChannelList).toHaveBeenCalled();
    });
  });
  describe('navigation', () => {
    it('clicking select channels button should navigate to channel selection view', () => {
      wrapper.setData({ loadingChannels: false });
      wrapper.find('[data-test="select"]').trigger('click');
      expect(wrapper.vm.step).toBe(2);
    });
    it('clicking finish should navigate back to collection details view', () => {
      wrapper.setData({ loadingChannels: false, step: 2 });
      return wrapper.vm.$nextTick().then(() => {
        wrapper.find('[data-test="finish"]').trigger('click');
        expect(wrapper.vm.step).toBe(1);
      });
    });
  });
  describe('on close', () => {
    it('clicking close button should close the modal', () => {
      wrapper.find('[data-test="close"]').trigger('click');
      wrapper.vm.$nextTick(() => {
        expect(wrapper.vm.$route.name).toBe(RouterNames.CHANNEL_SETS);
      });
    });
    it('should close the modal if collection is new and delete the collection', () => {
      const deleteChannelSet = jest.fn(() => Promise.resolve());
      wrapper = makeWrapper({ isNew: true });
      wrapper.setMethods({ deleteChannelSet });
      wrapper.find('[data-test="close"]').trigger('click');
      expect(deleteChannelSet).toHaveBeenCalled();
    });
    it('should prompt user if there are unsaved changes', () => {
      wrapper.setData({ changed: true });
      wrapper.find('[data-test="close"]').trigger('click');
      expect(wrapper.vm.showUnsavedDialog).toBe(true);
    });
  });
  describe('on save', () => {
    it('clicking save should call save method', () => {
      const save = jest.fn();
      wrapper.setMethods({ save });
      wrapper.find('[data-test="save"]').trigger('click');
      expect(save).toHaveBeenCalled();
    });
    it('should not save if fields are invalid', () => {
      const setChannels = jest.fn();
      wrapper.setMethods({ setChannels });
      wrapper.find('[data-test="save"]').trigger('click');
      expect(setChannels).not.toHaveBeenCalled();
    });
  });
});
