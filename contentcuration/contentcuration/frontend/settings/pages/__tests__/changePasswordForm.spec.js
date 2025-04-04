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

  it('validation should fail if passwords do not match', async () => {
    await wrapper.setData({ password: 'test' });
    expect(typeof wrapper.vm.passwordConfirmRules[0]('data')).toBe('string');
  });

  it('failed validation should not call updateUserPassword', async () => {
    const updateUserPassword = jest.spyOn(wrapper.vm, 'updateUserPassword');
    updateUserPassword.mockImplementation(() => Promise.resolve());
    await wrapper.vm.submitPassword();
    expect(updateUserPassword).not.toHaveBeenCalled();
  });

  it('clicking submit should call updateUserPassword', async () => {
    const updateUserPassword = jest.spyOn(wrapper.vm, 'updateUserPassword');
    updateUserPassword.mockImplementation(() => Promise.resolve());
    await wrapper.setData({ password: 'tester123', confirmation: 'tester123' });
    await wrapper.vm.submitPassword();
    expect(updateUserPassword).toHaveBeenCalled();
  });
});
