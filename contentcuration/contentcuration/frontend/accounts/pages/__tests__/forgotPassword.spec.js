import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import ForgotPassword from '../resetPassword/ForgotPassword';

function makeWrapper() {
  return mount(ForgotPassword, {
    // Need to add a router instance as a child component relies on route linking
    router: new VueRouter(),
  });
}

describe('forgotPassword', () => {
  let wrapper;
  let sendPasswordResetLink;

  beforeEach(() => {
    wrapper = makeWrapper();
    sendPasswordResetLink = jest.spyOn(wrapper.vm, 'sendPasswordResetLink');
    sendPasswordResetLink.mockImplementation(() => Promise.resolve());
  });
  it('should not call sendPasswordResetLink on submit if email is invalid', async () => {
    wrapper.findComponent({ ref: 'form' }).trigger('submit');
    await wrapper.vm.$nextTick();
    expect(sendPasswordResetLink).not.toHaveBeenCalled();
  });
  it('should call sendPasswordResetLink on submit if email is valid', async () => {
    wrapper.setData({ email: 'test@test.com' });
    await wrapper.vm.$nextTick();
    wrapper.findComponent({ ref: 'form' }).trigger('submit');
    await wrapper.vm.$nextTick();
    expect(sendPasswordResetLink).toHaveBeenCalled();
  });
});
