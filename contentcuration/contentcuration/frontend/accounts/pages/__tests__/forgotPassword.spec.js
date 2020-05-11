import { mount } from '@vue/test-utils';
import ForgotPassword from '../resetPassword/ForgotPassword';

const sendPasswordResetLink = jest.fn();

function makeWrapper() {
  return mount(ForgotPassword);
}

describe('forgotPassword', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
    wrapper.setMethods({
      sendPasswordResetLink: () => {
        return new Promise(resolve => {
          sendPasswordResetLink();
          resolve();
        });
      },
    });
    sendPasswordResetLink.mockReset();
  });
  it('should not call sendPasswordResetLink on submit if email is invalid', () => {
    wrapper.find({ ref: 'form' }).trigger('submit');
    expect(sendPasswordResetLink).not.toHaveBeenCalled();
  });
  it('should call sendPasswordResetLink on submit if email is valid', () => {
    wrapper.setData({ email: 'test@test.com' });
    wrapper.find({ ref: 'form' }).trigger('submit');
    expect(sendPasswordResetLink).toHaveBeenCalled();
  });
});
