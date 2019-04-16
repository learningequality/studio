import { mount } from '@vue/test-utils';
import ChannelStar from './../views/ChannelStar.vue';
import { localStore, mockFunctions } from './data';
import { ListTypes } from './../constants';

function makeWrapper(starred) {
  let channel = {
    id: 'test channel',
    name: 'test title',
    modified: new Date(),
    STARRED: starred,
  };
  localStore.commit('channel_list/SET_CHANNEL_LIST', {
    channels: [channel],
    listType: ListTypes.EDITABLE,
  });
  return mount(ChannelStar, {
    store: localStore,
    propsData: {
      channelID: channel.id,
    },
  });
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
