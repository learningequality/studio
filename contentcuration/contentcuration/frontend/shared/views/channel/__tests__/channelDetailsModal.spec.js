import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import ChannelDetailsModal from './../ChannelDetailsModal';
import storeFactory from 'shared/vuex/baseStore';

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

  it('clicking close should close the modal', async () => {
    await wrapper.findComponent('[data-test="close"]').trigger('click');
    expect(wrapper.vm.dialog).toBe(false);
  });

  it('clicking download CSV button should call generateChannelsCSV', async () => {
    await wrapper.setData({ loading: false });
    const generateChannelsCSV = jest.spyOn(wrapper.vm, 'generateChannelsCSV');
    generateChannelsCSV.mockImplementation(() => Promise.resolve());
    await wrapper.findComponent('[data-test="dl-csv"]').trigger('click');
    expect(generateChannelsCSV).toHaveBeenCalledWith([wrapper.vm.channelWithDetails]);
  });

  describe('load', () => {
    let loadChannel;
    let loadChannelDetails;

    beforeEach(() => {
      loadChannel = jest.spyOn(wrapper.vm, 'loadChannel');
      loadChannelDetails = jest.spyOn(wrapper.vm, 'loadChannelDetails');
    });

    it('should automatically close if loadChannel does not find a channel', async () => {
      await wrapper.vm.load();
      expect(wrapper.vm.dialog).toBe(false);
    });

    it('load should call loadChannel and loadChannelDetails', async () => {
      await wrapper.vm.load();
      expect(loadChannel).toHaveBeenCalled();
      expect(loadChannelDetails).toHaveBeenCalled();
    });

    it('load should update document.title', async () => {
      const channel = { name: 'testing channel' };
      loadChannel.mockImplementation(() => Promise.resolve(channel));
      await wrapper.vm.load();
      expect(document.title).toContain(channel.name);
    });
  });
});
