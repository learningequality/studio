import { mount } from '@vue/test-utils';
import ChangePasswordForm from '../Account/ChangePasswordForm';
import { factory } from '../../store';

function makeWrapper() {
  return mount(ChangePasswordForm, {
    store: factory(),
    sync: false,
    propsData: {
      value: true,
    },
  });
}

describe('changePasswordForm', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = makeWrapper();
  });

  it('validation should fail if the password is too short', async () => {
    await wrapper.setData({ password: 'test' });
    expect(wrapper.vm.errors.password).toBe(true);
  });

  it('validation should fail if the passwords do not match', async () => {
    await wrapper.setData({ password: 'testtest', confirmation: 'testtest2' });
    expect(wrapper.vm.errors.confirmation).toBe(true);
  });

  it('failed validation should not call updateUserPassword', async () => {
    const updateUserPassword = jest.spyOn(wrapper.vm, 'updateUserPassword');
    updateUserPassword.mockImplementation(() => Promise.resolve());
    await wrapper.vm.submit();
    expect(updateUserPassword).not.toHaveBeenCalled();
  });

  it('clicking submit should call updateUserPassword', async () => {
    const updateUserPassword = jest.spyOn(wrapper.vm, 'updateUserPassword');
    updateUserPassword.mockImplementation(() => Promise.resolve());
    await wrapper.setData({ password: 'tester123', confirmation: 'tester123' });
    await wrapper.vm.submit();
    expect(updateUserPassword).toHaveBeenCalled();
  });
});
