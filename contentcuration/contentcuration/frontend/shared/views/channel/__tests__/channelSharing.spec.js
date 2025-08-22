import { mount } from '@vue/test-utils';
import ChannelSharing from './../ChannelSharing';
import storeFactory from 'shared/vuex/baseStore';
import { SharingPermissions } from 'shared/constants';

const store = storeFactory();
const channelId = '11111111111111111111111111111111';
let loadChannelUsers;

function makeWrapper(computed = {}) {
  loadChannelUsers = jest.spyOn(ChannelSharing.methods, 'loadChannelUsers');
  loadChannelUsers.mockImplementation(() => Promise.resolve());

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
    stubs: {
      ChannelSharingTable: true,
    },
  });
}

describe('channelSharing', () => {
  let wrapper;
  let sendInvitation;
  beforeEach(() => {
    wrapper = makeWrapper();
    sendInvitation = jest.spyOn(wrapper.vm, 'sendInvitation');
    sendInvitation.mockImplementation(() => Promise.resolve());
  });
  afterEach(() => {
    loadChannelUsers.mockRestore();
  });
  it('should load users on mounted', async () => {
    await wrapper.vm.$nextTick();
    expect(loadChannelUsers).toHaveBeenCalled();
  });
  it('should call submitEmail on form submit', async () => {
    const submitEmail = jest.spyOn(wrapper.vm, 'submitEmail');
    wrapper.findComponent({ ref: 'form' }).trigger('submit');
    await wrapper.vm.$nextTick();
    expect(submitEmail).toHaveBeenCalled();
  });
  it('should not call sendInvitation if email is blank', async () => {
    wrapper.setData({ loading: false });
    await wrapper.vm.$nextTick();
    await wrapper.vm.submitEmail();
    expect(sendInvitation).not.toHaveBeenCalled();
  });
  // Examples drawn from:
  // https://en.wikipedia.org/wiki/Email_address#Examples
  it.each([
    'not a real email',
    '<this@hotmail.com>',
    'Abc.example.com',
    'A@b@c@example.com',
    'a"b(c)d,e:f;g<h>i[j\\k]l@example.com',
    // Don't validate these two examples just yet
    // 'just"not"right@example.com',
    // 'this is"not\allowed@example.com',
    'this\\ still\\"not\\\\allowed@example.com',
    '1234567890123456789012345678901234567890123456789012345678901234+x@example.com',
    'i_like_underscore@but_its_not_allowed_in_this_part.example.com',
    'QA[icon]CHOCOLATE[icon]@test.com',
  ])('should not call sendInvitation if email is invalid: %s', async email => {
    wrapper.setData({ email, loading: false });
    await wrapper.vm.$nextTick();
    await wrapper.vm.submitEmail();
    expect(sendInvitation).not.toHaveBeenCalled();
  });
  it('should set an error if user already has access to channel', async () => {
    wrapper = makeWrapper({
      checkUsers() {
        return () => true;
      },
    });
    wrapper.setData({ email: 'test@test.com', loading: false });
    await wrapper.vm.$nextTick();
    await wrapper.vm.submitEmail();
    expect(wrapper.vm.error).toBeTruthy();
    expect(sendInvitation).not.toHaveBeenCalled();
  });
  it('should set an error if user has already been invited', async () => {
    wrapper = makeWrapper({
      checkInvitations() {
        return () => true;
      },
    });
    wrapper.setData({ email: 'test@test.com', loading: false });
    await wrapper.vm.$nextTick();
    await wrapper.vm.submitEmail();
    expect(wrapper.vm.error).toBeTruthy();
    expect(sendInvitation).not.toHaveBeenCalled();
  });
  // Examples drawn from:
  // https://en.wikipedia.org/wiki/Email_address#Examples
  it.each([
    'simple@example.com',
    'very.common@example.com',
    'disposable.style.email.with+symbol@example.com',
    'other.email-with-hyphen@example.com',
    'fully-qualified-domain@example.com',
    'user.name+tag+sorting@example.com',
    'x@example.com',
    'example-indeed@strange-example.com',
    'test/test@test.com',
    'admin@mailserver1',
    'example@s.example',
    '" "@example.org',
    '"john..doe"@example.org',
    'mailhost!username@example.org',
    'user%example.com@example.org',
    'user-@example.org',
  ])('should call sendInvitation if email is valid: %s', async email => {
    wrapper.setData({ email });
    await wrapper.vm.$nextTick();
    await wrapper.vm.submitEmail();
    expect(sendInvitation).toHaveBeenCalledWith({
      email,
      shareMode: SharingPermissions.EDIT,
      channelId,
    });
  });
  it('should call sendInvitation with correct share permission', async () => {
    wrapper.setData({ email: 'test@test.com', shareMode: SharingPermissions.VIEW_ONLY });
    await wrapper.vm.$nextTick();
    await wrapper.vm.submitEmail();
    expect(sendInvitation).toHaveBeenCalledWith({
      email: 'test@test.com',
      shareMode: SharingPermissions.VIEW_ONLY,
      channelId,
    });
  });
});
