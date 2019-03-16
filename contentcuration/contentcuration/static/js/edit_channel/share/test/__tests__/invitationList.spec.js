import { shallowMount } from '@vue/test-utils';
import InvitationList from './../../views/InvitationList.vue';
import InvitationItem from './../../views/InvitationItem.vue';
import { localStore, mockFunctions, Invitations } from './../data.js';


function makeWrapper() {
  return shallowMount(InvitationList, {
    store: localStore
  })
}


describe('shareInvitationList', () => {

  it('loadInvitationList should be called', () => {
    let listWrapper = makeWrapper();
    expect(mockFunctions.loadInvitationList).toHaveBeenCalled();
  })

  it('list should load all users', () => {
    let listWrapper = makeWrapper();
    listWrapper.vm.$nextTick().then(() => {
      let actualLength = listWrapper.findAll(InvitationItem).length;
      expect(actualLength).toEqual(Invitations.length);
    })
  });
});
