import { mount } from '@vue/test-utils';
import router from '../../router';
import ResetPassword from '../resetPassword/ResetPassword';

function makeWrapper() {
  return mount(ResetPassword, { router });
}

describe('resetPassword', () => {
  let wrapper, setPassword;

  beforeEach(() => {
    wrapper = makeWrapper();
    setPassword = jest.spyOn(wrapper.vm, 'setPassword');
    setPassword.mockImplementation(() => Promise.resolve());
  });

  it('should not call setPassword on submit if password 1 is not set', async () => {
    await wrapper.setData({ new_password2: 'pass' });
    await wrapper.findComponent({ ref: 'form' }).trigger('submit');
    expect(setPassword).not.toHaveBeenCalled();
  });

  it('should not call setPassword on submit if password 2 is not set', async () => {
    await wrapper.setData({ new_password1: 'pass' });
    await wrapper.findComponent({ ref: 'form' }).trigger('submit');
    expect(setPassword).not.toHaveBeenCalled();
  });

  it('should not call setPassword on submit if passwords do not not match', async () => {
    await wrapper.setData({ new_password1: 'pass', new_password2: 'pass2' });
    await wrapper.findComponent({ ref: 'form' }).trigger('submit');
    expect(setPassword).not.toHaveBeenCalled();
  });

  it('should call setPassword on submit if password data is valid', async () => {
    await wrapper.setData({ new_password1: 'passw123', new_password2: 'passw123' });
    await wrapper.findComponent({ ref: 'form' }).trigger('submit');
    expect(setPassword).toHaveBeenCalled();
  });

  it('should retain data from query params so reset credentials are preserved', async () => {
    router.replace({
      name: 'ResetPassword',
      query: {
        test: 'testing',
      },
    });
    await wrapper.setData({ new_password1: 'passw123', new_password2: 'passw123' });
    await wrapper.findComponent({ ref: 'form' }).trigger('submit');
    expect(setPassword.mock.calls[0][0].test).toBe('testing');
  });
});
