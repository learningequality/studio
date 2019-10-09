import { mount } from '@vue/test-utils';
import ChannelStar from '../ChannelStar.vue';

const channelId = "testing";

function makeWrapper(bookmark, toggleStub) {
  const wrapper = mount(ChannelStar, {
    propsData: {
      bookmark,
      channelId,
    },
  });
  wrapper.setMethods({
    toggleBookmark: toggleStub,
  });
  return wrapper;
}

describe('star', () => {
  let starredWrapper;
  let unstarredWrapper;
  let toggleStub = jest.fn();
  beforeEach(() => {
    starredWrapper = makeWrapper(true, toggleStub);
    unstarredWrapper = makeWrapper(false, toggleStub);
  });
  it('should reflect correct star on load', () => {
    expect(starredWrapper.find('VIcon').text()).toBe('star');
    expect(unstarredWrapper.find('VIcon').text()).toBe('star_border');
  });
  it('toggle the bookmark when clicked', () => {
    starredWrapper.find('VBtn').trigger('click');
    expect(toggleStub).toHaveBeenCalledWith(channelId);
  });
});
