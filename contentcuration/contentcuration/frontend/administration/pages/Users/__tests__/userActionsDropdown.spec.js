import { mount } from '@vue/test-utils';
import router from '../../../router';
import { factory } from '../../../store';
import UserActionsDropdown from '../UserActionsDropdown';

const store = factory();

const userId = 'test-user-id';
const user = {
  id: userId,
  name: 'Testy User',
};

function makeWrapper(userProps = {}) {
  const wrapper = mount(UserActionsDropdown, {
    router,
    store,
    propsData: { userId },
    computed: {
      currentId() {
        return 'admin-user';
      },
      user() {
        return {
          ...user,
          ...userProps,
        };
      },
    },
    stubs: {
      EmailUsersDialog: true,
    },
  });

  const updateUser = jest.spyOn(wrapper.vm, 'updateUser');
  updateUser.mockResolvedValue(null);

  const deleteUser = jest.spyOn(wrapper.vm, 'deleteUser');
  deleteUser.mockResolvedValue(null);

  return [wrapper, { updateUser, deleteUser }];
}

describe('userActionsDropdown', () => {
  let wrapper, mocks;

  it('clicking email should open email dialog', async () => {
    [wrapper] = makeWrapper();
    await wrapper.findComponent('[data-test="email"]').trigger('click');
    expect(wrapper.vm.emailDialog).toBe(true);
  });

  it('certain options should be hidden for administrators', () => {
    [wrapper] = makeWrapper({ is_admin: true });
    expect(wrapper.find('[data-test="deactivate"]').exists()).toBe(false);
  });

  describe('inactive user actions', () => {
    beforeEach(() => {
      [wrapper, mocks] = makeWrapper({ is_active: false });
    });

    it('activate user should call upateUser with is_active = true', async () => {
      await wrapper.findComponent('[data-test="activate"]').trigger('click');
      expect(mocks.updateUser).toHaveBeenCalledWith({ id: userId, is_active: true });
    });

    it('delete user should open delete confirmation', async () => {
      await wrapper.findComponent('[data-test="delete"]').trigger('click');
      expect(wrapper.vm.deleteDialog).toBe(true);
    });

    it('confirm delete user should call deleteUser', async () => {
      await wrapper.findComponent('[data-test="delete"]').trigger('click');
      wrapper.findComponent('[data-test="confirm-delete"]').vm.$emit('submit');
      expect(mocks.deleteUser).toHaveBeenCalledWith(userId);
    });

    it('confirm delete user should emit deleted event', async () => {
      await wrapper.vm.deleteHandler();
      expect(wrapper.emitted('deleted')).toHaveLength(1);
    });
  });

  describe('active user actions', () => {
    beforeEach(() => {
      [wrapper, mocks] = makeWrapper({ is_active: true });
    });

    it('deactivate button should open deactivate confirmation', async () => {
      await wrapper.findComponent('[data-test="deactivate"]').trigger('click');
      expect(wrapper.vm.deactivateDialog).toBe(true);
    });

    it('confirm deactivate should call updateUser with is_active = false', async () => {
      await wrapper.findComponent('[data-test="deactivate"]').trigger('click');
      wrapper.findComponent('[data-test="confirm-deactivate"]').vm.$emit('submit');
      expect(mocks.updateUser).toHaveBeenCalledWith({ id: userId, is_active: false });
    });

    it('addadmin button should open addadmin confirmation', async () => {
      await wrapper.findComponent('[data-test="addadmin"]').trigger('click');
      expect(wrapper.vm.addAdminPrivilegeDialog).toBe(true);
    });

    it('addAdminHandler should call updateUser with is_admin = true', async () => {
      wrapper.vm.addAdminHandler();
      expect(mocks.updateUser).toHaveBeenCalledWith({ id: userId, is_admin: true });
    });

    it('removeadmin button should open addadmin confirmation', async () => {
      [wrapper] = makeWrapper({ is_active: true, is_admin: true });
      await wrapper.findComponent('[data-test="removeadmin"]').trigger('click');
      expect(wrapper.vm.removeAdminPrivilegeDialog).toBe(true);
    });

    it('removeAdminHandler should call updateUser with is_admin = false', () => {
      wrapper.vm.removeAdminHandler();
      expect(mocks.updateUser).toHaveBeenCalledWith({ id: userId, is_admin: false });
    });
  });
});
