import { mount } from '@vue/test-utils';
import router from '../../../router';
import { factory } from '../../../store';
import { RouteNames } from '../../../constants';
import ChannelDetails from './../ChannelDetails';

const store = factory();

const channelId = '11111111111111111111111111111111';

function makeWrapper() {
  router.replace({ name: RouteNames.CHANNEL, params: { channelId } });
  return mount(ChannelDetails, {
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
    stubs: {
      ChannelActionsDropdown: true,
      ChannelSharing: true,
    },
  });
}

describe('channelDetails', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = makeWrapper();
  });

  it('clicking close should close the modal', () => {
    wrapper.vm.dialog = false;
    expect(wrapper.vm.$route.name).toBe(RouteNames.CHANNELS);
  });

  describe('load', () => {
    it('should automatically close if loadChannel does not find a channel', async () => {
      const loadChannel = jest.spyOn(wrapper.vm, 'loadChannel');
      loadChannel.mockReturnValue(Promise.resolve());
      const loadChannelDetails = jest.spyOn(wrapper.vm, 'loadChannelDetails');
      loadChannelDetails.mockReturnValue(Promise.resolve());
      await wrapper.vm.load();
      expect(wrapper.vm.$route.name).toBe(RouteNames.CHANNELS);
    });

    it('load should call loadChannel and loadChannelDetails', async () => {
      const loadChannel = jest.spyOn(wrapper.vm, 'loadChannel');
      loadChannel.mockReturnValue(Promise.resolve({ id: channelId }));
      const loadChannelDetails = jest.spyOn(wrapper.vm, 'loadChannelDetails');
      loadChannelDetails.mockReturnValue(Promise.resolve());
      await wrapper.vm.load();
      expect(loadChannel).toHaveBeenCalled();
      expect(loadChannelDetails).toHaveBeenCalled();
    });
  });

  it('clicking info tab should navigate to info tab', async () => {
    wrapper.vm.tab = 'share';
    await wrapper.findComponent('[data-test="info-tab"] a').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.tab).toBe('info');
  });

  it('clicking share tab should navigate to share tab', async () => {
    await wrapper.find('[data-test="share-tab"] a').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.tab).toBe('share');
  });
});
