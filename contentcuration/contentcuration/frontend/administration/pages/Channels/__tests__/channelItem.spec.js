import { mount } from '@vue/test-utils';
import router from '../../../router';
import { factory } from '../../../store';
import { RouteNames } from '../../../constants';
import ChannelItem from '../ChannelItem';

const store = factory();

const channelId = '11111111111111111111111111111111';
const channel = {
  id: channelId,
  name: 'Channel Test',
  created: new Date(),
  modified: new Date(),
  public: true,
  published: true,
  primary_token: 'testytesty',
  deleted: false,
  demo_server_url: 'demo.com',
  source_url: 'source.com',
};

function makeWrapper() {
  router.replace({ name: RouteNames.CHANNELS }).catch(() => {});
  return mount(ChannelItem, {
    router,
    store,
    propsData: {
      channelId,
      value: [],
    },
    computed: {
      channel() {
        return channel;
      },
    },
    stubs: {
      ChannelActionsDropdown: true,
    },
  });
}

describe('channelItem', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = makeWrapper();
  });

  it('selecting the channel should emit list with channel id', () => {
    wrapper.vm.selected = true;
    expect(wrapper.emitted('input')[0][0]).toEqual([channelId]);
  });

  it('deselecting the channel should emit list without channel id', async () => {
    await wrapper.setProps({ value: [channelId] });
    wrapper.vm.selected = false;
    expect(wrapper.emitted('input')[0][0]).toEqual([]);
  });

  it('saveDemoServerUrl should call updateChannel with new demo_server_url', async () => {
    const updateChannel = jest.spyOn(wrapper.vm, 'updateChannel');
    updateChannel.mockReturnValue(Promise.resolve());
    await wrapper.vm.saveDemoServerUrl();
    expect(updateChannel).toHaveBeenCalledWith({
      id: channelId,
      demo_server_url: channel.demo_server_url,
    });
  });

  it('saveSourceUrl should call updateChannel with new source_url', async () => {
    const updateChannel = jest.spyOn(wrapper.vm, 'updateChannel');
    updateChannel.mockReturnValue(Promise.resolve());
    await wrapper.vm.saveSourceUrl();
    expect(updateChannel).toHaveBeenCalledWith({
      id: channelId,
      source_url: channel.source_url,
    });
  });
});
