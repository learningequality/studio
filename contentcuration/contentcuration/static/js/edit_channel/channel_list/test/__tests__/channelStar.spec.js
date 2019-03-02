import { mount } from '@vue/test-utils';
import ChannelStar from './../../views/ChannelStar.vue';
import _ from 'underscore';
import { localStore, mockFunctions } from './../data';


function makeWrapper(starred) {
  return mount(ChannelStar, {
    store: localStore,
    propsData: {
      channel: {
        name: "test",
        STARRED: starred
      }
    }
  })
}

describe('channelStar', () => {

  it('clicking the star should toggle the star', () => {
    function test(starred) {
      let wrapper = makeWrapper(starred);
      let star = wrapper.find('a');
      star.trigger('click');
    }
    test(true);
    expect(mockFunctions.removeStar).toHaveBeenCalled();
    test(false);
    expect(mockFunctions.addStar).toHaveBeenCalled();
  });
});
