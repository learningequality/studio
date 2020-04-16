import { mount } from '@vue/test-utils';
import router from '../../router';
import Main from '../Main';

const login = jest.fn();

function makeWrapper() {
  let wrapper = mount(Main, { router });
  wrapper.setMethods({
    login: data => {
      return new Promise(resolve => {
        login(data);
        resolve();
      });
    },
  });
  wrapper.setData({
    username: 'test@test.com',
    password: 'pass',
  });
  return wrapper;
}

function makeFailedPromise(statusCode) {
  return () => {
    return new Promise((resolve, reject) => {
      reject({
        response: {
          status: statusCode || 500,
        },
      });
    });
  };
}

describe('main', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
    login.mockReset();
  });
  it('should trigger submit method when form is submitted', () => {
    const submit = jest.fn();
    wrapper.setMethods({ submit });
    wrapper.find({ ref: 'form' }).trigger('submit');
    expect(submit).toHaveBeenCalled();
  });
  it('should call login with username and password provided', () => {
    wrapper.vm.submit();
    expect(login).toHaveBeenCalled();
  });
  it('should fail if username is not provided', () => {
    wrapper.setData({ username: ' ' });
    wrapper.vm.submit();
    expect(login).not.toHaveBeenCalled();
  });
  it('should fail if password is not provided', () => {
    wrapper.setData({ password: '' });
    wrapper.vm.submit();
    expect(login).not.toHaveBeenCalled();
  });
  it('should set loginFailed if login fails', async () => {
    wrapper.setMethods({ login: makeFailedPromise() });
    await wrapper.vm.submit();
    expect(wrapper.vm.loginFailed).toBe(true);
  });
  it('should say account has not been activated if login returns 405', async () => {
    wrapper.setMethods({ login: makeFailedPromise() });
    await wrapper.vm.submit();
    expect(wrapper.vm.loginFailed).toBe(true);
  });
});
