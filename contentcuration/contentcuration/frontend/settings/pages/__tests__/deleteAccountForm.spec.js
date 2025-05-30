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
    deleteAccount = jest.spyOn(wrapper.vm, 'deleteAccount');
    deleteAccount.mockImplementation(() => Promise.resolve());
  });

  it('should fail if accountDeletionEmail is null', () => {
    wrapper.vm.deleteUserAccount();
    expect(deleteAccount).not.toHaveBeenCalled();
  });
  it('should fail if accountDeletionEmail does not match user email', async () => {
    await wrapper.setData({ accountDeletionEmail: 'nottherightemail@test.com' });
    wrapper.vm.deleteUserAccount();
    expect(deleteAccount).not.toHaveBeenCalled();
  });
  it('should succeed if form is valid', async () => {
    await wrapper.setData({ accountDeletionEmail: email });
    wrapper.vm.deleteUserAccount();
    expect(deleteAccount).toHaveBeenCalled();
  });
  it('should show KModal if account deletion fails', async () => {
    await wrapper.setData({ accountDeletionEmail: email });
    deleteAccount.mockImplementation(() => Promise.reject('error'));
    try {
      await wrapper.vm.deleteUserAccount();
    } catch (e) {
      throw new Error(e);
    }
    await wrapper.vm.$nextTick();
    const modals = wrapper.findAllComponents({ name: 'KModal' });
    const errorModal = modals.at(1);
    expect(errorModal.exists()).toBe(true);
    expect(errorModal.text()).toContain(
      'Failed to delete your account. Please contact us here: https://community.learningequality.org.',
    );
  });
});
