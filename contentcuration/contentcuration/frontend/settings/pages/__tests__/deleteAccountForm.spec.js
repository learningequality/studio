import { mount } from '@vue/test-utils';
import { factory } from '../../store';
import DeleteAccountForm from '../Account/DeleteAccountForm';

const store = factory();
const email = 'test@testing.com';
function makeWrapper() {
  return mount(DeleteAccountForm, {
    store,
    propsData: {
      value: true,
    },
    computed: {
      user() {
        return { email };
      },
    },
  });
}

describe('deleteAccountForm', () => {
  let wrapper;
  let deleteAccount;

  beforeEach(() => {
    wrapper = makeWrapper();
    deleteAccount = jest.fn().mockReturnValue(Promise.resolve());
    wrapper.setMethods({ deleteAccount });
  });

  it('should fail if accountDeletionEmail is null', () => {
    wrapper.vm.deleteUserAccount();
    expect(deleteAccount).not.toHaveBeenCalled();
  });
  it('should fail if accountDeletionEmail does not match user email', () => {
    wrapper.setData({ accountDeletionEmail: 'nottherightemail@test.com' });
    wrapper.vm.deleteUserAccount();
    expect(deleteAccount).not.toHaveBeenCalled();
  });
  it('should succeed if form is valid', () => {
    wrapper.setData({ accountDeletionEmail: email });
    wrapper.vm.deleteUserAccount();
    expect(deleteAccount).toHaveBeenCalled();
  });
  it('should show alert if account deletion fails', () => {
    wrapper.setData({ accountDeletionEmail: email });
    deleteAccount = jest.fn(() => Promise.reject('error'));
    wrapper.vm.deleteUserAccount().catch(() => {
      expect(wrapper.vm.deletionFailed).toBe(true);
    });
  });
});
