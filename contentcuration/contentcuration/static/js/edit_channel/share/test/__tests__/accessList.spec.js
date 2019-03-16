import { shallowMount } from '@vue/test-utils';
import AccessList from './../../views/AccessList.vue';
import UserItem from './../../views/UserItem.vue';
import { localStore, mockFunctions, Users } from './../data.js';


function makeWrapper() {
  return shallowMount(AccessList, {
    store: localStore
  })
}


describe('shareAccessList', () => {

  it('loadAccessList should be called', () => {
    let listWrapper = makeWrapper();
    expect(mockFunctions.loadAccessList).toHaveBeenCalled();
  })

  it('list should load all users', () => {
    let listWrapper = makeWrapper();
    listWrapper.vm.$nextTick().then(() => {
      let actualLength = listWrapper.findAll(UserItem).length;
      expect(actualLength).toEqual(Users.length);
    })
  });
});
