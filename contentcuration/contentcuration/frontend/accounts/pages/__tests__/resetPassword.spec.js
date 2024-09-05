import { mount } from '@vue/test-utils';
import router from '../../router';
import ResetPassword from '../resetPassword/ResetPassword';

const setPassword = jest.fn();

function makeWrapper() {
  return mount(ResetPassword, { router });
}

describe('resetPassword', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
    wrapper.setMethods({
      setPassword: data => {
        return new Promise(resolve => {
          setPassword(data);
          resolve();
        });
      },
    });
    setPassword.mockReset();
  });
  it('should not call setPassword on submit if password 1 is not set', () => {
    wrapper.setData({ new_password2: 'pass' });
    wrapper.find({ ref: 'form' }).trigger('submit');
    expect(setPassword).not.toHaveBeenCalled();
  });
  it('should not call setPassword on submit if password 2 is not set', () => {
    wrapper.setData({ new_password1: 'pass' });
    wrapper.find({ ref: 'form' }).trigger('submit');
    expect(setPassword).not.toHaveBeenCalled();
  });
  it('should not call setPassword on submit if passwords do not not match', () => {
    wrapper.setData({ new_password1: 'pass', new_password2: 'pass2' });
    wrapper.find({ ref: 'form' }).trigger('submit');
    expect(setPassword).not.toHaveBeenCalled();
  });
  it('should call setPassword on submit if password data is valid', () => {
    wrapper.setData({ new_password1: 'pass', new_password2: 'pass' });
    wrapper.vm.$nextTick(() => {
      wrapper.find({ ref: 'form' }).trigger('submit');
      expect(setPassword).toHaveBeenCalled();
    });
  });
  it('should retain data from query params so reset credentials are preserved', () => {
    router.replace({
      name: 'ResetPassword',
      query: {
        test: 'testing',
      },
    });
    wrapper.setData({ new_password1: 'pass', new_password2: 'pass' });
    wrapper.vm.$nextTick(() => {
      wrapper.find({ ref: 'form' }).trigger('submit');
      expect(setPassword.mock.calls[0][0].test).toBe('testing');
    });
  });
});
