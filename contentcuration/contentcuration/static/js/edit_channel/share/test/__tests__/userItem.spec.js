import { mount } from '@vue/test-utils';
import UserItem from './../../views/UserItem.vue';
import { localStore, mockFunctions, Users, currentUser, defaultChannel } from './../data.js';
import { Permissions } from './../../constants';
import _ from 'underscore';
import State from 'edit_channel/state';
const Models = require("edit_channel/models");
import { getHighestPermission } from './../../utils';


function makeWrapper(user) {
  return mount(UserItem, {
    store: localStore,
    propsData: {
      model: (user.attributes)? user.toJSON() : user
    }
  })
}

function getWrappers() {
  let wrappers = [];
  _.each(Users, (user) => {
    wrappers.push(makeWrapper(user));
  });
  return wrappers;
}

describe('shareUserItem', () => {

  beforeEach(() => {
    localStore.dispatch('share/loadAccessList');
    localStore.commit('share/SET_CHANNEL', defaultChannel);
    State.current_user = new Models.UserModel(currentUser);
  })

  it('access icon should reflect user permission', () => {
    let wrappers = getWrappers();
    _.each(wrappers, (wrapper) => {
      let accessIcon = wrapper.find('.access-icon');
      expect(accessIcon.classes()).toContain(wrapper.vm.userPermission);
    })
  });

  it('managers should see leave option for themselves', () => {
    let wrapper = makeWrapper(currentUser);
    let leaveOption = wrapper.find('.leave');
    let removeButton = wrapper.findAll('.remove');
    expect(removeButton).toHaveLength(0);
    expect(leaveOption.classes()).not.toContain('disabled');
    leaveOption.trigger('click');

    // Dialog should pop up
    expect(document.querySelector('#dialog-box')).toBeTruthy();
    expect(mockFunctions.removeUser).not.toHaveBeenCalled();

    // Check direct function call
    wrapper.vm.removeUser(wrapper.vm.model);
    expect(mockFunctions.removeUser).toHaveBeenCalled();
  });

  it('admins should see join option for channels they don\'t have access to', () => {
    let newUser = {id: -1, is_admin: true};
    State.current_user = new Models.UserModel(newUser);
    let wrapper = makeWrapper(newUser);
    let joinOption = wrapper.find('.join');
    let leaveOption = wrapper.findAll('.leave');
    let removeButton = wrapper.findAll('.remove');

    expect(leaveOption).toHaveLength(0);
    expect(removeButton).toHaveLength(0);
    joinOption.trigger('click')
    // Dialog should pop up
    expect(document.querySelector('#dialog-box')).toBeTruthy();
    expect(mockFunctions.addEditor).not.toHaveBeenCalled();

    // Check direct function call
    wrapper.vm.addEditor(wrapper.vm.model);
    expect(mockFunctions.addEditor).toHaveBeenCalled();
  });

  it('leaving channel should be disabled for channels with one editor', () => {
    let highestPermission = getHighestPermission();
    localStore.commit('share/SET_CHANNEL', {[highestPermission.field]: [currentUser]});
    let wrapper = makeWrapper(currentUser);
    let leaveOption = wrapper.find('.leave');
    expect(leaveOption.classes()).toContain('disabled');
  });

  it('remove option should remove the user from the channel', () => {
    let wrappers = getWrappers();
    _.each(wrappers, (wrapper) => {
      mockFunctions.removeUser.mockReset();
      if(!wrapper.vm.isSelf) {
        let removeButton = wrapper.find('.remove');
        removeButton.trigger('click');
        // Dialog should pop up
        expect(document.querySelector('#dialog-box')).toBeTruthy();
        expect(mockFunctions.removeUser).not.toHaveBeenCalled();

        // Check direct function call
        wrapper.vm.removeUser(wrapper.vm.model);
        expect(mockFunctions.removeUser).toHaveBeenCalled();
      }
    })
  });

  it('remove option should be hidden from non managers', () => {
    State.current_user = new Models.UserModel({id: -1});
    let wrappers = getWrappers();
    _.each(wrappers, (wrapper) => {
      let removeButton = wrapper.findAll('.remove');
      expect(removeButton).toHaveLength(0);
    })
  });
});
