import { mount } from '@vue/test-utils';
import router from '../../router';
import AccountsMain from '../AccountsMain.vue';

const login = jest.fn();

function makeWrapper() {
  const wrapper = mount(AccountsMain, {
    router,
    stubs: ['GlobalSnackbar', 'PolicyModals'],
    mocks: {
      $store: {
        state: {
          connection: {
            online: true,
          },
        },
      },
    },
  });
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
  let wrapper, loginToProceed;
  beforeEach(async () => {
    wrapper = makeWrapper();
    login.mockReset();
    await wrapper.vm.$nextTick();
    loginToProceed = wrapper.findAll('[data-test="loginToProceed"]').at(0);
  });
  afterEach(() => {
    if (wrapper) {
      wrapper.destroy();
    }
  });
  it('should trigger submit method when form is submitted', () => {
    expect(loginToProceed.isVisible()).toBe(false);
    const submit = jest.fn();
    wrapper.setMethods({ submit });
    wrapper.find({ ref: 'form' }).trigger('submit');
    expect(submit).toHaveBeenCalled();
  });
  it('should call login with username and password provided', () => {
    expect(loginToProceed.isVisible()).toBe(false);
    wrapper.vm.submit();
    expect(login).toHaveBeenCalled();
  });
  it('should fail if username is not provided', () => {
    expect(loginToProceed.isVisible()).toBe(false);
    wrapper.setData({ username: ' ' });
    wrapper.vm.submit();
    expect(login).not.toHaveBeenCalled();
  });
  it('should fail if password is not provided', () => {
    expect(loginToProceed.isVisible()).toBe(false);
    wrapper.setData({ password: '' });
    wrapper.vm.submit();
    expect(login).not.toHaveBeenCalled();
  });
  it('should set loginFailed if login fails', async () => {
    expect(loginToProceed.isVisible()).toBe(false);
    wrapper.setMethods({ login: makeFailedPromise() });
    await wrapper.vm.submit();
    expect(wrapper.vm.loginFailed).toBe(true);
  });
  it('should say account has not been activated if login returns 405', async () => {
    expect(loginToProceed.isVisible()).toBe(false);
    wrapper.setMethods({ login: makeFailedPromise() });
    await wrapper.vm.submit();
    expect(wrapper.vm.loginFailed).toBe(true);
  });
  it('should navigate to next url if next query param is set', async () => {
    const testUrl = '/testnext/';
    const location = new URL(`http://studio.time/?next=${testUrl}`);

    delete window.location;
    window.location = location;
    window.location.assign = jest.fn();

    wrapper.destroy();
    wrapper = makeWrapper();
    await wrapper.vm.$nextTick();
    loginToProceed = wrapper.findAll('[data-test="loginToProceed"]').at(0);
    expect(loginToProceed.isVisible()).toBe(true);

    await wrapper.vm.submit();
    expect(window.location.assign.mock.calls[0][0]).toBe(testUrl);
  });
});
