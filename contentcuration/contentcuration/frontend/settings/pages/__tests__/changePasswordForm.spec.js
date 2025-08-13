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
  it('should render the form', () => {
    const wrapper = makeWrapper();
    expect(wrapper.html()).toContain('Change password');
    expect(wrapper.html()).toContain('New password');
    expect(wrapper.html()).toContain('Confirm new password');
    expect(wrapper.html()).toContain('Save changes');
    expect(wrapper.html()).toContain('Cancel');
  });

  describe('if a password is too short', () => {
    let updateUserPassword;
    let wrapper;

    beforeAll(async () => {
      wrapper = makeWrapper();
      updateUserPassword = jest.spyOn(wrapper.vm, 'updateUserPassword');
      const passwordInputs = wrapper.findAll('input[type="password"]');
      passwordInputs.at(0).setValue('pw');
      wrapper.findComponent({ name: 'KModal' }).vm.$emit('submit');
      await wrapper.vm.$nextTick();
    });

    it('should show a correct error message', () => {
      expect(wrapper.html()).toContain('Password should be at least 8 characters long');
    });

    it('should not call updateUserPassword', () => {
      expect(updateUserPassword).not.toHaveBeenCalled();
    });
  });

  describe(`if passwords don't match`, () => {
    let updateUserPassword;
    let wrapper;

    beforeAll(async () => {
      wrapper = makeWrapper();
      updateUserPassword = jest.spyOn(wrapper.vm, 'updateUserPassword');
      const passwordInputs = wrapper.findAll('input[type="password"]');
      passwordInputs.at(0).setValue('password1');
      passwordInputs.at(1).setValue('password2');
      wrapper.findComponent({ name: 'KModal' }).vm.$emit('submit');
      await wrapper.vm.$nextTick();
    });

    it('should show a correct error message', () => {
      expect(wrapper.html()).toContain(`Passwords don't match`);
    });

    it('should not call updateUserPassword', () => {
      expect(updateUserPassword).not.toHaveBeenCalled();
    });
  });

  describe('if passwords match and are valid', () => {
    let updateUserPassword;
    let wrapper;

    beforeAll(async () => {
      wrapper = makeWrapper();
      updateUserPassword = jest.spyOn(wrapper.vm, 'updateUserPassword');
      const passwordInputs = wrapper.findAll('input[type="password"]');
      passwordInputs.at(0).setValue('password123');
      passwordInputs.at(1).setValue('password123');
      wrapper.findComponent({ name: 'KModal' }).vm.$emit('submit');
      await wrapper.vm.$nextTick();
    });

    it('should not show any error messages', () => {
      expect(wrapper.html()).not.toContain('Password should be at least 8 characters long');
      expect(wrapper.html()).not.toContain(`Passwords don't match`);
    });

    it('should call updateUserPassword', () => {
      expect(updateUserPassword).toHaveBeenCalled();
    });
  });
});
