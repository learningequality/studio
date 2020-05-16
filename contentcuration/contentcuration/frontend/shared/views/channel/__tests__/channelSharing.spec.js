import { mount } from '@vue/test-utils';
import ChannelSharing from './../ChannelSharing';
import storeFactory from 'shared/vuex/baseStore';
import { SharingPermissions } from 'shared/constants';

const store = storeFactory();
const channelId = '11111111111111111111111111111111';
const loadChannelUsers = jest.fn();

function makeWrapper(computed = {}) {
  return mount(ChannelSharing, {
    sync: false,
    store,
    propsData: {
      channelId,
    },
    computed: {
      channel() {
        return {
          name: 'test',
          deleted: false,
          edit: true,
          id: channelId,
          editors: [],
          viewers: [],
        };
      },
      checkUsers() {
        return () => false;
      },
      checkInvitations() {
        return () => false;
      },
      ...computed,
    },
    methods: {
      loadChannelUsers: () => {
        loadChannelUsers();
        return Promise.resolve();
      },
    },
    stubs: {
      ChannelSharingTable: true,
    },
  });
}

describe('channelSharing', () => {
  let wrapper;
  const sendInvitation = jest.fn();
  beforeEach(() => {
    wrapper = makeWrapper();
    wrapper.setMethods({
      sendInvitation(data) {
        sendInvitation(data);
        return Promise.resolve();
      },
    });
    sendInvitation.mockReset();
  });
  it('should load users on mounted', () => {
    expect(loadChannelUsers).toHaveBeenCalled();
  });
  it('should call submitEmail on form submit', () => {
    const submitEmail = jest.fn();
    wrapper.setMethods({ submitEmail });
    wrapper.find({ ref: 'form' }).trigger('submit');
    expect(submitEmail).toHaveBeenCalled();
  });
  it('should not call sendInvitation if email is blank', () => {
    wrapper.setData({ loading: false });
    wrapper.vm.submitEmail();
    expect(sendInvitation).not.toHaveBeenCalled();
  });
  it('should not call sendInvitation if email is invalid', () => {
    wrapper.setData({ email: 'not a real email', loading: false });
    wrapper.vm.submitEmail();
    expect(sendInvitation).not.toHaveBeenCalled();
  });
  it('should set an error if user already has access to channel', () => {
    wrapper = makeWrapper({
      checkUsers() {
        return () => true;
      },
    });
    wrapper.setData({ email: 'test@test.com', loading: false });
    wrapper.vm.submitEmail();
    expect(wrapper.vm.error).toBeTruthy();
    expect(sendInvitation).not.toHaveBeenCalled();
  });
  it('should set an error if user has already been invited', () => {
    wrapper = makeWrapper({
      checkInvitations() {
        return () => true;
      },
    });
    wrapper.setData({ email: 'test@test.com', loading: false });
    wrapper.vm.submitEmail();
    expect(wrapper.vm.error).toBeTruthy();
    expect(sendInvitation).not.toHaveBeenCalled();
  });
  it('should call sendInvitation if email is valid', () => {
    wrapper.setData({ email: 'test@test.com' });
    wrapper.vm.submitEmail();
    expect(sendInvitation).toHaveBeenCalledWith({
      email: 'test@test.com',
      shareMode: SharingPermissions.EDIT,
      channelId,
    });
  });
  it('should call sendInvitation with correct share permission', () => {
    wrapper.setData({ email: 'test@test.com', shareMode: SharingPermissions.VIEW_ONLY });
    wrapper.vm.submitEmail();
    expect(sendInvitation).toHaveBeenCalledWith({
      email: 'test@test.com',
      shareMode: SharingPermissions.VIEW_ONLY,
      channelId,
    });
  });
});
