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
      $tr: text => text,
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

  it('clicking name link should show name change form', () => {
    wrapper.find('[data-test="name-form"]').trigger('click');
    expect(wrapper.vm.showFullNameForm).toBe(true);
  });

  it('clicking password link should show password change form', () => {
    wrapper.find('[data-test="password-form"]').trigger('click');
    expect(wrapper.vm.showPasswordForm).toBe(true);
  });

  it('clicking export data button should call exportData', async () => {
    const exportData = jest.spyOn(wrapper.vm, 'exportData');
    exportData.mockImplementation(() => Promise.resolve());
    await wrapper.find('[data-test="export-link"]').trigger('click');
    expect(exportData).toHaveBeenCalled();
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.showExportDataNotice).toBe(true);
  });

  it('export data failure', async () => {
    const exportData = jest.spyOn(wrapper.vm, 'exportData');
    exportData.mockImplementation(() => Promise.reject('error'));
    await wrapper.find('[data-test="export-link"]').trigger('click');
    expect(exportData).toHaveBeenCalled();
    expect(wrapper.vm.showExportDataNotice).toBe(false);
    expect(wrapper.vm.$store.dispatch).toHaveBeenCalledWith('showSnackbar', {
      text: wrapper.vm.$tr('exportFailed'),
    });
  });
});
