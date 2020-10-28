import { mount } from '@vue/test-utils';
import router from '../../../router';
import { factory } from '../../../store';
import UserActionsDropdown from '../UserActionsDropdown';

const store = factory();

const userId = 'test-user-id';
const updateUser = jest.fn().mockReturnValue(Promise.resolve());
const user = {
  id: userId,
  name: 'Testy User',
};

function makeWrapper(userProps = {}) {
  return mount(UserActionsDropdown, {
    router,
    store,
    propsData: { userId },
    computed: {
      user() {
        return {
          ...user,
          ...userProps,
        };
      },
    },
    methods: {
      updateUser,
    },
    stubs: {
      EmailUsersDialog: true,
    },
  });
}

describe('userActionsDropdown', () => {
  let wrapper;
  beforeEach(() => {
    updateUser.mockClear();
  });

  it('clicking email should open email dialog', () => {
    wrapper = makeWrapper();
    wrapper.find('[data-test="email"]').trigger('click');
    expect(wrapper.vm.emailDialog).toBe(true);
  });
  it('certain options should be hidden for administrators', () => {
    wrapper = makeWrapper({ is_admin: true });
    expect(wrapper.find('[data-test="deactivate"]').exists()).toBe(false);
  });

  describe('inactive user actions', () => {
    beforeEach(() => {
      wrapper = makeWrapper({ is_active: false });
    });
    it('activate user should call upateUser with is_active = true', () => {
      wrapper.find('[data-test="activate"]').trigger('click');
      expect(updateUser).toHaveBeenCalledWith({ id: userId, is_active: true });
    });
    it('delete user should open delete confirmation', () => {
      wrapper.find('[data-test="delete"]').trigger('click');
      expect(wrapper.vm.deleteDialog).toBe(true);
    });
    it('confirm delete user should call deleteUser', () => {
      const deleteUser = jest.fn().mockReturnValue(Promise.resolve());
      wrapper.setMethods({ deleteUser });
      wrapper.find('[data-test="confirm-delete"]').vm.$emit('confirm');
      expect(deleteUser).toHaveBeenCalledWith(userId);
    });
    it('confirm delete user should emit deleted event', () => {
      const deleteUser = jest.fn().mockReturnValue(Promise.resolve());
      wrapper.setMethods({ deleteUser });
      wrapper.vm.deleteHandler().then(() => {
        expect(wrapper.emitted('deleted')).toHaveLength(1);
      });
    });
  });
  describe('active user actions', () => {
    beforeEach(() => {
      wrapper = makeWrapper({ is_active: true });
    });
    it('deactivate button should open deactivate confirmation', () => {
      wrapper.find('[data-test="deactivate"]').trigger('click');
      expect(wrapper.vm.deactivateDialog).toBe(true);
    });
    it('confirm deactivate should call updateUser with is_active = false', () => {
      wrapper.find('[data-test="confirm-deactivate"]').vm.$emit('confirm');
      expect(updateUser).toHaveBeenCalledWith({ id: userId, is_active: false });
    });
  });
});
