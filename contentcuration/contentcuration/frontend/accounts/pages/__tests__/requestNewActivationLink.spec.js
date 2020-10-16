import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import RequestNewActivationLink from '../activateAccount/RequestNewActivationLink';

const sendActivationLink = jest.fn();

function makeWrapper() {
  return mount({
    ...RequestNewActivationLink,
    // Need to add a router instance as a child component relies on route linking
    router: new VueRouter(),
  });
}

describe('requestNewActivationLink', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
    wrapper.setMethods({
      sendActivationLink: () => {
        return new Promise(resolve => {
          sendActivationLink();
          resolve();
        });
      },
    });
    sendActivationLink.mockReset();
  });
  it('should not call sendActivationLink on submit if email is invalid', () => {
    wrapper.find({ ref: 'form' }).trigger('submit');
    expect(sendActivationLink).not.toHaveBeenCalled();
  });
  it('should call sendActivationLink on submit if email is valid', () => {
    wrapper.setData({ email: 'test@test.com' });
    wrapper.find({ ref: 'form' }).trigger('submit');
    expect(sendActivationLink).toHaveBeenCalled();
  });
});
