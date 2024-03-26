import { mount } from '@vue/test-utils';
import ChannelItem from '../ChannelItem.vue';

const channelId = 'testing channel';

function makeWrapper(slots = {}) {
  return mount(ChannelItem, {
    sync: false,
    slots,
    propsData: { channelId },
    computed: {
      channel() {
        return { id: channelId };
      },
    },
  });
}

describe('channelItem', () => {
  it('should properly render slot', () => {
    const wrapper = makeWrapper({
      default: '<div id="test"/>',
    });
    expect(wrapper.find('#test').exists()).toBe(true);
  });
});
