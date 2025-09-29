import { mount } from '@vue/test-utils';
import ChannelStar from '../ChannelStar.vue';

const channelId = 'testing';

function makeWrapper(bookmark, toggleStub) {
  const wrapper = mount(ChannelStar, {
    propsData: {
      bookmark,
      channelId,
    },
  });
  jest.spyOn(wrapper.vm, 'toggleStar').mockImplementation(toggleStub);
  return wrapper;
}

describe('star', () => {
  let starredWrapper;
  let unstarredWrapper;
  const toggleStub = jest.fn();

  beforeEach(() => {
    starredWrapper = makeWrapper(true, toggleStub);
    unstarredWrapper = makeWrapper(false, toggleStub);
  });

  it('should reflect correct star on load', () => {
    expect(starredWrapper.find('[data-test="button"]').vm.icon).toBe('star');
    expect(unstarredWrapper.find('[data-test="button"]').vm.icon).toBe('starBorder');
  });

  it('toggle the bookmark when clicked', async () => {
    await starredWrapper.findComponent('[data-test="button"]').trigger('click');
    expect(toggleStub).toHaveBeenCalled();
  });
});
