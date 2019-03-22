import { shallowMount } from '@vue/test-utils';
import ChannelSetList from './../views/ChannelSetList.vue';
import ChannelSetItem from './../views/ChannelSetItem.vue';
import { ChannelSets, localStore, mockFunctions } from './data';

require('handlebars/helpers'); // Needed for collection details modal

function makeWrapper() {
  return shallowMount(ChannelSetList, {
    store: localStore,
  });
}

describe('channelSetList', () => {
  let listWrapper;

  beforeEach(() => {
    listWrapper = makeWrapper();
  });

  it('loadChannelSetList should be called', () => {
    expect(mockFunctions.loadChannelSetList).toHaveBeenCalled();
  });

  it('list should load all channel sets', () => {
    listWrapper.vm.$nextTick().then(() => {
      let actualLength = listWrapper.findAll(ChannelSetItem).length;
      expect(actualLength).toEqual(ChannelSets.length);
    });
  });

  it('CREATE should open channel set modal', () => {
    listWrapper.find('#new-set').trigger('click');
    // TODO: check for channel_set/views/ChannelSetModal
  });
  it('About Collections link should open information modal', () => {
    listWrapper.find('#about-sets').trigger('click');
    // TODO: check for information/views/ChannelSetInformationModalView
  });
});
