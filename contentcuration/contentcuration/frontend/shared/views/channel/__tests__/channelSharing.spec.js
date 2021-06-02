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
  ])('should not call sendInvitation if email is invalid: %s', email => {
    wrapper.setData({ email, loading: false });
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
  ])('should call sendInvitation if email is valid: %s', email => {
    wrapper.setData({ email });
    wrapper.vm.submitEmail();
    expect(sendInvitation).toHaveBeenCalledWith({
      email,
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
