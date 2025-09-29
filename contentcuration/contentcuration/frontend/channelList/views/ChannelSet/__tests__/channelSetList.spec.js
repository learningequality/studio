import { mount } from '@vue/test-utils';
import { factory } from '../../../store';
import router from '../../../router';
import { RouteNames } from '../../../constants';
import ChannelSetList from '../ChannelSetList.vue';

const store = factory();

function makeWrapper() {
  router.push({
    name: RouteNames.CHANNEL_SETS,
  });
  return mount(ChannelSetList, { store, router });
}

describe('channelSetList', () => {
  let wrapper;

  beforeEach(async () => {
    wrapper = makeWrapper();
    await wrapper.setData({ loading: false });
  });

  it('should open a new channel set modal when new set button is clicked', async () => {
    const push = jest.fn();
    wrapper.vm.$router.push = push;
    await wrapper.find('[data-test="add-channelset"]').trigger('click');
    expect(push).toHaveBeenCalledWith({
      name: RouteNames.NEW_CHANNEL_SET,
    });
  });
});
