import { shallowMount } from '@vue/test-utils';
import ChannelInvitationList from './../views/ChannelInvitationList.vue';
import ChannelInvitationItem from './../views/ChannelInvitationItem.vue';
import { Invitations, localStore, mockFunctions } from './data';

function makeWrapper() {
  return shallowMount(ChannelInvitationList, {
    store: localStore,
  });
}

describe('channelInvitationList', () => {
  it('loadChannelInvitationList should be called', () => {
    makeWrapper();
    expect(mockFunctions.loadChannelInvitationList).toHaveBeenCalled();
  });

  it('list should load all invitations', () => {
    let listWrapper = makeWrapper();
    listWrapper.vm.$nextTick().then(() => {
      let actualLength = listWrapper.findAll(ChannelInvitationItem).length;
      expect(actualLength).toEqual(Invitations.length);
    });
  });
});
