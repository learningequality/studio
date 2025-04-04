import { mount } from '@vue/test-utils';
import router from '../../router';
import AccountsMain from '../AccountsMain.vue';

async function makeWrapper() {
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
  await wrapper.setData({
    username: 'test@test.com',
    password: 'pass',
  });

  const login = jest.spyOn(wrapper.vm, 'login');
  login.mockImplementation(() => Promise.resolve());
  return [wrapper, login];
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
  let wrapper, login, loginToProceed;

  beforeEach(async () => {
    [wrapper, login] = await makeWrapper();
    await wrapper.vm.$nextTick();
    loginToProceed = wrapper.findAllComponents('[data-test="loginToProceed"]').at(0);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy();
    }
  });

  it('should trigger submit method when form is submitted', async () => {
    expect(loginToProceed.isVisible()).toBe(false);
    const submit = jest.spyOn(wrapper.vm, 'submit');
    submit.mockImplementation(() => {});
    await wrapper.findComponent({ ref: 'form' }).trigger('submit');
    expect(submit).toHaveBeenCalled();
  });

  it('should call login with username and password provided', () => {
    expect(loginToProceed.isVisible()).toBe(false);
    wrapper.vm.submit();
    expect(login).toHaveBeenCalled();
  });

  it('should fail if username is not provided', async () => {
    expect(loginToProceed.isVisible()).toBe(false);
    await wrapper.setData({ username: ' ' });
    wrapper.vm.submit();
    expect(login).not.toHaveBeenCalled();
  });

  it('should fail if password is not provided', async () => {
    expect(loginToProceed.isVisible()).toBe(false);
    await wrapper.setData({ password: '' });
    wrapper.vm.submit();
    expect(login).not.toHaveBeenCalled();
  });

  it('should set loginFailed if login fails', async () => {
    expect(loginToProceed.isVisible()).toBe(false);
    jest.spyOn(wrapper.vm, 'login').mockImplementation(makeFailedPromise());
    await wrapper.vm.submit();
    expect(wrapper.vm.loginFailed).toBe(true);
  });

  it('should say account has not been activated if login returns 405', async () => {
    expect(loginToProceed.isVisible()).toBe(false);
    jest.spyOn(wrapper.vm, 'login').mockImplementation(makeFailedPromise());
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
    [wrapper, login] = await makeWrapper();
    await wrapper.vm.$nextTick();
    loginToProceed = wrapper.findAll('[data-test="loginToProceed"]').at(0);
    expect(loginToProceed.isVisible()).toBe(true);

    await wrapper.vm.submit();
    expect(window.location.assign.mock.calls[0][0]).toBe(testUrl);
  });
});
