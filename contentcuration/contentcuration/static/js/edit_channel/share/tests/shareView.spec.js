import { shallowMount } from '@vue/test-utils';
import ShareView from './../views/ShareView.vue';
import { localStore, mockFunctions, currentUser } from './data.js';
import { Permissions, PermissionRanks } from './../constants';
import _ from 'underscore';
import State from 'edit_channel/state';
const Models = require("edit_channel/models");
import { getHighestPermission } from './../utils';


function makeWrapper() {
  return shallowMount(ShareView, {
    store: localStore,
  })
}


describe('shareView', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
    mockFunctions.sendInvitation.mockReset();
  })

  it('permissions available should only include permissions at or below currentUserPermission', () => {
    let userRank = _.findWhere(PermissionRanks, {'shareMode': wrapper.vm.currentUserPermission});
    let ranks = _.filter(PermissionRanks, (rank) => {
      return rank.rank <= userRank.rank;
    })
    expect(wrapper.vm.permissions).toHaveLength(ranks.length);
    let allowedPermissions = wrapper.findAll('.permission');
    expect(allowedPermissions).toHaveLength(ranks.length);

    _.each(allowedPermissions.wrappers, (option) => {
      expect(wrapper.vm.permissions).toContain(option.element.value);
    });
  });

  it('sendInvitation should be triggered by button click', () => {
    let submitButton = wrapper.find('button[type="submit"]');
    let emailInput = wrapper.find('input[name="email"]');
    emailInput.setValue('test@test.com');
    submitButton.trigger('click');
    expect(mockFunctions.sendInvitation).toHaveBeenCalled();
  });

  it('sendInvitation should not be triggered if no email was provided', () => {
    let submitButton = wrapper.find('button[type="submit"]');
    submitButton.trigger('click');
    expect(mockFunctions.sendInvitation).not.toHaveBeenCalled();
  });

  it('attemptSendInvitation should have correct share_mode and email options', () => {
    let emailInput = wrapper.find('input[name="email"]');
    let shareOption = wrapper.find('select[name="permission"]');
    let submitButton = wrapper.find('button[type="submit"]');
    emailInput.setValue('test@test.com');

    function test(permission) {
      shareOption.setValue(permission);
      submitButton.trigger('click');
      let call = mockFunctions.sendInvitation.mock.calls[0][1];
      expect(call.email).toEqual('test@test.com');
      expect(call.share_mode).toEqual(permission);
      mockFunctions.sendInvitation.mockReset();
      wrapper.vm.sharing = false;
    }
    _.each(_.values(Permissions), test);
  });
});
