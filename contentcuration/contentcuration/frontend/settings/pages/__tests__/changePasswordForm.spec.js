import { mount } from '@vue/test-utils';
import ChangePasswordForm from '../Account/ChangePasswordForm';

function makeWrapper() {
  return mount(ChangePasswordForm, {
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

  it('validation should fail if passwords do not match', () => {
    wrapper.setData({ password: 'test' });
    expect(typeof wrapper.vm.passwordConfirmRules[0]('data')).toBe('string');
  });
  it('failed validation should not call updateUserPassword', () => {
    const updateUserPassword = jest.fn().mockReturnValue(Promise.resolve());
    wrapper.setMethods({ updateUserPassword });
    wrapper.vm.submitPassword();
    expect(updateUserPassword).not.toHaveBeenCalled();
  });
  it('clicking submit should call updateUserPassword', () => {
    const updateUserPassword = jest.fn().mockReturnValue(Promise.resolve());
    wrapper.setMethods({ updateUserPassword });
    wrapper.setData({ password: 'test', confirmation: 'test' });
    wrapper.vm.$nextTick(() => {
      wrapper.vm.submitPassword();
      expect(updateUserPassword).toHaveBeenCalled();
    });
  });
});
