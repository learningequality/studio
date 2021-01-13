import Vue from 'vue';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import ChannelDetailsModal from './../ChannelDetailsModal';
import storeFactory from 'shared/vuex/baseStore';

Vue.use(VueRouter);

const PARENTROUTE = 'Parent route';
const TESTROUTE = 'test channel details modal route';
const router = new VueRouter({
  routes: [
    {
      name: PARENTROUTE,
      path: '/',
      props: true,
      children: [
        {
          name: TESTROUTE,
          path: '/testroute',
          props: true,
          component: ChannelDetailsModal,
        },
      ],
    },
  ],
});

const store = storeFactory();
const channelId = '11111111111111111111111111111111';

function makeWrapper() {
  return mount(ChannelDetailsModal, {
    router,
    store,
    propsData: {
      channelId,
    },
    computed: {
      channel() {
        return {
          name: 'test',
        };
      },
    },
  });
}

describe('channelDetailsModal', () => {
  let wrapper;
  beforeEach(() => {
    router.push({
      name: TESTROUTE,
      params: {
        channelId,
      },
    });
    wrapper = makeWrapper();
  });
  it('clicking close should close the modal', () => {
    const close = jest.fn();
    wrapper.setMethods({ close });
    wrapper.find('[data-test="close"]').trigger('click');
    expect(wrapper.vm.dialog).toBe(false);
  });
  it('clicking download CSV button should call generateChannelsCSV', () => {
    wrapper.setData({ loading: false });
    const generateChannelsCSV = jest.fn();
    wrapper.setMethods({ generateChannelsCSV });
    wrapper.find('[data-test="dl-csv"]').trigger('click');
    expect(generateChannelsCSV).toHaveBeenCalledWith([wrapper.vm.channelWithDetails]);
  });

  describe('load', () => {
    beforeEach(() => {
      wrapper.setMethods({
        loadChannel() {
          return Promise.resolve();
        },
        loadChannelDetails() {
          return Promise.resolve();
        },
      });
    });
    it('should automatically close if loadChannel does not find a channel', () => {
      return wrapper.vm.load().then(() => {
        expect(wrapper.vm.dialog).toBe(false);
      });
    });
    it('load should call loadChannel and loadChannelDetails', () => {
      const loadChannel = jest.fn();
      const loadChannelDetails = jest.fn();
      wrapper.setMethods({
        loadChannel() {
          loadChannel();
          return Promise.resolve({ id: channelId });
        },
        loadChannelDetails() {
          loadChannelDetails();
          return Promise.resolve();
        },
      });
      return wrapper.vm.load().then(() => {
        expect(loadChannel).toHaveBeenCalled();
        expect(loadChannelDetails).toHaveBeenCalled();
      });
    });
    it('load should update document.title', () => {
      const channel = { name: 'testing channel' };
      wrapper.setMethods({
        loadChannel() {
          return Promise.resolve(channel);
        },
      });
      return wrapper.vm.load().then(() => {
        expect(document.title).toContain(channel.name);
      });
    });
  });
});
