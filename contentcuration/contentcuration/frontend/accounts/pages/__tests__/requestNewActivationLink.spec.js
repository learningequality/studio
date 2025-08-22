import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import RequestNewActivationLink from '../activateAccount/RequestNewActivationLink';

function makeWrapper() {
  return mount(RequestNewActivationLink, {
    // Need to add a router instance as a child component relies on route linking
    router: new VueRouter(),
  });
}

describe('requestNewActivationLink', () => {
  let wrapper;
  let sendActivationLink;

  beforeEach(() => {
    wrapper = makeWrapper();
    sendActivationLink = jest.spyOn(wrapper.vm, 'sendActivationLink');
    sendActivationLink.mockImplementation(() => Promise.resolve());
  });

  it('should not call sendActivationLink on submit if email is invalid', async () => {
    await wrapper.findComponent({ ref: 'form' }).trigger('submit');
    expect(sendActivationLink).not.toHaveBeenCalled();
  });

  it('should call sendActivationLink on submit if email is valid', async () => {
    await wrapper.setData({ email: 'test@test.com' });
    await wrapper.findComponent({ ref: 'form' }).trigger('submit');
    expect(sendActivationLink).toHaveBeenCalled();
  });
});
