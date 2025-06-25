import { mount } from '@vue/test-utils';
import Account from '../Account/index';

function makeWrapper(currentUser = {}) {
  return mount(Account, {
    computed: {
      user() {
        return {
          email: 'test@testing.com',
          first_name: 'First',
          last_name: 'Last',
          ...currentUser,
        };
      },
      channels() {
        return currentUser.channels || [];
      },
    },
    stubs: {
      DeleteAccountForm: true,
      FullNameForm: true,
      ChangePasswordForm: true,
    },
    mocks: {
      $store: {
        dispatch: jest.fn(),
      },
    },
  });
}

describe('account tab', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });

  describe('delete button', () => {
    it('should be hidden for admins', () => {
      wrapper = makeWrapper({ is_admin: true, channels: [] });
      expect(wrapper.find('[data-test="delete"]').exists()).toBe(false);
    });
    it('should be hidden if user is sole editor on a channel', () => {
      wrapper = makeWrapper({ channels: [{ editor_count: 1 }] });
      expect(wrapper.find('[data-test="delete"]').exists()).toBe(false);
    });
    it('should be visible if user is not a sole editor on any channels', () => {
      // TODO: add KThemePlugin to jest_config/setup (getting syntax error)
      // wrapper = makeWrapper({channels: [{editor_count: 2}]});
      // expect(wrapper.find('[data-test="delete"]').exists()).toBe(true);
    });
    it('click should open delete account modal', () => {
      // TODO: add KThemePlugin to jest_config/setup (getting syntax error)
      // wrapper = makeWrapper({channels: [{editor_count: 2}]});
      // wrapper.find('[data-test="delete"]').trigger('click');
      // expect(wrapper.vm.showDeleteConfirmation).toBe(true);
    });
  });

  it(`clicking 'Edit full name' link should show name change form`, () => {
    wrapper.find('[data-test="edit-name-btn"]').trigger('click');
    const nameForm = wrapper.findComponent({ name: 'FullNameForm' });
    expect(nameForm.exists()).toBe(true);
    expect(nameForm.isVisible()).toBe(true);
  });

  it(`clicking 'Change password' button should show password change form`, () => {
    wrapper.find('[data-test="change-password-btn"]').trigger('click');
    const passwordForm = wrapper.findComponent({ name: 'ChangePasswordForm' });
    expect(passwordForm.exists()).toBe(true);
    expect(passwordForm.isVisible()).toBe(true);
  });

  describe('clicking export data button', () => {
    let exportData;

    beforeEach(async () => {
      exportData = jest.spyOn(wrapper.vm, 'exportData');
      exportData.mockImplementation(() => Promise.resolve());
      wrapper.find('[data-test="export-link"]').trigger('click');
      await wrapper.vm.$nextTick();
    });

    it(`should call 'exportData'`, async () => {
      expect(exportData).toHaveBeenCalled();
    });

    it('should display export data notice', async () => {
      const notice = wrapper.find('[data-test="export-notice"]');
      expect(notice.exists()).toBe(true);
      expect(notice.isVisible()).toBe(true);
      expect(notice.text()).toContain(
        "You'll receive an email with your data when the export is completed",
      );
    });
  });

  describe('on export data failure', () => {
    let exportData;

    beforeEach(async () => {
      exportData = jest.spyOn(wrapper.vm, 'exportData');
      exportData.mockImplementation(() => Promise.reject('error'));
      wrapper.find('[data-test="export-link"]').trigger('click');
      await wrapper.vm.$nextTick();
    });

    it(`shouldn't display export data notice`, async () => {
      const notice = wrapper.find('[data-test="export-notice"]');
      expect(notice.exists()).toBe(false);
    });

    it(`should call 'showSnackbar' with a correct message`, () => {
      expect(wrapper.vm.$store.dispatch).toHaveBeenCalledWith('showSnackbar', {
        text: 'Unable to export data. Please try again.',
      });
    });
  });
});
