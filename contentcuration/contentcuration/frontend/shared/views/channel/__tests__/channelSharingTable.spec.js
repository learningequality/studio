import { mount } from '@vue/test-utils';
import ChannelSharingTable from './../ChannelSharingTable';
import storeFactory from 'shared/vuex/baseStore';
import { SharingPermissions } from 'shared/constants';

const store = storeFactory();
const currentUser = { id: 'testId' };
store.state.session.currentUser = currentUser;

const channelId = 'test-channel';
const channelUsers = [{ id: 'other-user' }, currentUser];
const channelInvitations = [{ id: 'invitation-test' }];

function makeWrapper(users, invites) {
  return mount(ChannelSharingTable, {
    store,
    propsData: {
      channelId,
      mode: SharingPermissions.EDIT,
    },
    computed: {
      getChannelUsers() {
        return () => users || channelUsers;
      },
      getChannelInvitations() {
        return () => invites || channelInvitations;
      },
    },
  });
}

describe('channelSharingTable', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('should add current user to top of list', () => {
    expect(wrapper.vm.users[0].id).toBe(currentUser.id);
    expect(wrapper.vm.users[1].id).toBe(channelUsers[0].id);
  });
  it('should set all invitations as pending', () => {
    expect(wrapper.vm.invitations[0].pending).toBe(true);
  });
  describe('confirmation modals', () => {
    it('clicking make editor option should open makeEditor confirmation modal', () => {
      wrapper.setProps({ mode: SharingPermissions.VIEW_ONLY });
      wrapper.find('[data-test="makeeditor"]').trigger('click');
      expect(wrapper.vm.showMakeEditor).toBe(true);
    });
    it('clicking remove viewer option should open removeViewer confirmation modal', () => {
      wrapper.setProps({ mode: SharingPermissions.VIEW_ONLY });
      wrapper.find('[data-test="removeviewer"]').trigger('click');
      expect(wrapper.vm.showRemoveViewer).toBe(true);
    });
  });
  describe('actions', () => {
    const invite = {
      id: 'test-invitation',
      email: 'test@testing.com',
      declined: false,
    };
    const user = {
      id: 'test-user',
    };

    beforeEach(() => {
      wrapper = makeWrapper([user], [invite]);
    });

    it('resendInvitation should call sendInvitation', () => {
      const sendInvitation = jest.fn();
      wrapper.setMethods({
        sendInvitation: data => {
          sendInvitation(data);
          return Promise.resolve();
        },
      });
      wrapper.find('[data-test="resend"]').trigger('click');
      expect(sendInvitation).toHaveBeenCalledWith({
        email: invite.email,
        channelId,
        shareMode: SharingPermissions.EDIT,
      });
    });
    it('handleDelete should call deleteInvitation', () => {
      wrapper.setData({ selected: invite });
      const deleteInvitation = jest.fn();
      wrapper.setMethods({
        deleteInvitation: data => {
          deleteInvitation(data);
          return Promise.resolve();
        },
      });
      wrapper.find('[data-test="confirm-delete"]').trigger('click');
      expect(deleteInvitation).toHaveBeenCalledWith(invite.id);
    });
    it('clicking delete option should open delete confirmation modal', () => {
      wrapper.find('[data-test="delete"]').trigger('click');
      expect(wrapper.vm.showDeleteInvitation).toBe(true);
    });
    it('grantEditAccess should call makeEditor', () => {
      wrapper.setData({ selected: user });
      wrapper.setProps({ mode: SharingPermissions.VIEW_ONLY });
      const makeEditor = jest.fn();
      wrapper.setMethods({
        makeEditor: data => {
          makeEditor(data);
          return Promise.resolve();
        },
      });
      wrapper.find('[data-test="confirm-makeeditor"]').trigger('click');
      expect(makeEditor).toHaveBeenCalledWith({ userId: user.id, channelId });
    });
    it('handleRemoveViewer should call removeViewer', () => {
      wrapper.setData({ selected: user });
      wrapper.setProps({ mode: SharingPermissions.VIEW_ONLY });
      const removeViewer = jest.fn();
      wrapper.setMethods({
        removeViewer: data => {
          removeViewer(data);
          return Promise.resolve();
        },
      });
      wrapper.find('[data-test="confirm-remove"]').trigger('click');
      expect(removeViewer).toHaveBeenCalledWith({ userId: user.id, channelId });
    });
  });
});
