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
    it('should automatically close if loadChannel does not find a channel', () => {
      wrapper.setMethods({
        loadChannel: jest.fn().mockReturnValue(Promise.resolve()),
        loadChannelDetails: jest.fn().mockReturnValue(Promise.resolve()),
      });
      return wrapper.vm.load().then(() => {
        expect(wrapper.vm.$route.name).toBe(RouteNames.CHANNELS);
      });
    });
    it('load should call loadChannel and loadChannelDetails', () => {
      const loadChannel = jest.fn().mockReturnValue(Promise.resolve({ id: channelId }));
      const loadChannelDetails = jest.fn().mockReturnValue(Promise.resolve());
      wrapper.setMethods({ loadChannel, loadChannelDetails });
      return wrapper.vm.load().then(() => {
        expect(loadChannel).toHaveBeenCalled();
        expect(loadChannelDetails).toHaveBeenCalled();
      });
    });
  });
  it('clicking info tab should navigate to info tab', () => {
    wrapper.vm.tab = 'share';
    wrapper.find('[data-test="info-tab"] a').trigger('click');
    wrapper.vm.$nextTick(() => {
      expect(wrapper.vm.tab).toBe('info');
    });
  });
  it('clicking share tab should navigate to share tab', () => {
    wrapper.find('[data-test="share-tab"] a').trigger('click');
    wrapper.vm.$nextTick(() => {
      expect(wrapper.vm.tab).toBe('share');
    });
  });
});
