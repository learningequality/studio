import { shallowMount } from '@vue/test-utils';
import _ from 'underscore';
import ChannelList from './../views/ChannelList.vue';
import ChannelItem from './../views/ChannelItem.vue';
import { Channels, localStore, mockFunctions } from './data';
import { ListTypes } from './../constants';

function makeWrapper(listType) {
  return shallowMount(ChannelList, {
    store: localStore,
    propsData: {
      listType: listType || ListTypes.EDITABLE,
    },
  });
}

describe('channelList', () => {
  let editListWrapper;
  let starredListWrapper;
  let publicListWrapper;
  let viewonlyListWrapper;

  beforeEach(() => {
    editListWrapper = makeWrapper(ListTypes.EDITABLE);
    starredListWrapper = makeWrapper(ListTypes.STARRED);
    publicListWrapper = makeWrapper(ListTypes.PUBLIC);
    viewonlyListWrapper = makeWrapper(ListTypes.VIEW_ONLY);
  });

  describe('populating lists', () => {
    function testAll(test) {
      test(editListWrapper);
      test(starredListWrapper);
      test(publicListWrapper);
      test(viewonlyListWrapper);
    }

    it('loadChannelList should be called', () => {
      expect(mockFunctions.loadChannelList).toHaveBeenCalled();
    });

    it('channels are shown in their respective lists', () => {
      function test(wrapper) {
        let channels = wrapper.findAll(ChannelItem);
        let expectedLength = _.where(Channels, { [wrapper.props('listType')]: true }).length;
        expect(channels).toHaveLength(expectedLength);
      }
      testAll(test);
    });

    it('new channels are added to the edit list', () => {
      let newchannel = { id: 'new', name: 'test' };
      localStore.commit('channel_list/SUBMIT_CHANNEL', newchannel);
      function test(wrapper) {
        let match = _.find(wrapper.vm.listChannels, { id: 'new' });
        if (wrapper.props('listType') === ListTypes.EDITABLE) {
          expect(match).toBeTruthy();
        } else {
          expect(match).toBeUndefined();
        }
      }
      testAll(test);
    });

    it('channel edits are reflected across lists', () => {
      let edittedChannel = { id: 'channel5', name: 'test' };
      localStore.commit('channel_list/SUBMIT_CHANNEL', edittedChannel);
      function test(wrapper) {
        let match = _.find(wrapper.vm.listChannels, { id: 'channel5' });

        // If a channel is part of a list, make sure the name change has been registered
        if (match) {
          expect(match.name).toBe('test');
        }
      }
      testAll(test);
    });

    it('starred channels are added to the starred list', () => {
      let channel = localStore.state.channel_list.channels[0];
      channel.STARRED = true;
      function test(wrapper) {
        let match = _.find(wrapper.vm.listChannels, { id: channel.id });

        // Make sure starred channels are added to the starred list
        // Otherwise, make sure the STARRED property has been updated
        if (wrapper.props('listType') === ListTypes.STARRED) {
          expect(match).toBeTruthy();
        } else if (match) {
          expect(match.STARRED).toBe(true);
        }
      }
      testAll(test);
    });

    it('unstarred channels are removed from the starred list', () => {
      let channel = _.find(localStore.state.channel_list.channels, { STARRED: true });
      channel.STARRED = false;
      function test(wrapper) {
        let match = _.find(wrapper.vm.listChannels, { id: channel.id });

        // Make sure unstarred channels are removed from the starred list
        // Otherwise, make sure the STARRED property has been updated
        if (wrapper.props('listType') === ListTypes.STARRED) {
          expect(match).toBeUndefined();
        } else if (match) {
          expect(match.STARRED).toBe(false);
        }
      }
      testAll(test);
    });
  });
});
