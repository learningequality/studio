import { mount } from '@vue/test-utils';
import UserPrivilegeModal from '../UserPrivilegeModal';

const userId = 'test-user-id';
const updateUser = jest.fn().mockReturnValue(Promise.resolve());
const currentEmail = 'mytest@email.com';

function makeWrapper(props = {}) {
  return mount(UserPrivilegeModal, {
    propsData: {
      userId,
      value: true,
      ...props,
    },
    computed: {
      user() {
        return {
          id: userId,
        };
      },
      currentEmail() {
        return currentEmail;
      },
    },
    methods: { updateUser },
  });
}

describe('userPrivilegeModal', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = makeWrapper();
    updateUser.mockClear();
  });
  it('clicking cancel should reset the values', () => {
    wrapper = makeWrapper({ emailConfirm: 'testing' });
    wrapper.find('[data-test="cancel"]').trigger('click');
    expect(wrapper.vm.emailConfirm).toBe('');
  });
  it('submitting form should call revokeAdminPrivilege', () => {
    const revokeAdminPrivilege = jest.fn();
    wrapper.setMethods({ revokeAdminPrivilege });
    wrapper.find({ ref: 'form' }).trigger('submit');
    expect(revokeAdminPrivilege).toHaveBeenCalled();
  });
  it('revokeAdminPrivilege should not call updateUser if emailConfirm is blank', () => {
    wrapper.vm.revokeAdminPrivilege().then(() => {
      expect(updateUser).not.toHaveBeenCalled();
    });
  });
  it('revokeAdminPrivilege should not call updateUser if emailConfirm is not correct', () => {
    wrapper.setData({ emailConfirm: 'notmytest@email.com' });
    wrapper.vm.revokeAdminPrivilege().then(() => {
      expect(updateUser).not.toHaveBeenCalled();
    });
  });
  it('revokeAdminPrivilege should call updateUser if form is valid', () => {
    wrapper.setData({ emailConfirm: currentEmail });
    wrapper.vm.revokeAdminPrivilege().then(() => {
      expect(updateUser).toHaveBeenCalledWith({ id: userId, is_admin: false });
    });
  });
});
