import account from '../index';
import storeFactory from 'shared/vuex/baseStore';
import client from 'shared/client';

jest.mock('shared/client');
jest.mock('shared/vuex/connectionPlugin');

describe('account store', () => {
  let store;
  beforeEach(() => {
    store = storeFactory({
      modules: { account },
    });
  });
  describe('account actions', () => {
    beforeEach(() => {
      client.post.mockRestore();
    });
    it('register should call client.post register with form data', () => {
      const testData = { email: 'test@test.com' };
      return store.dispatch('account/register', testData).then(() => {
        expect(client.post.mock.calls[0][0]).toBe('register');
        expect(client.post.mock.calls[0][1]).toEqual(testData);
      });
    });
    it('sendActivationLink should call client.post request_activation_link with email', () => {
      const email = 'testing@test.com';
      return store.dispatch('account/sendActivationLink', email).then(() => {
        expect(client.post.mock.calls[0][0]).toBe('request_activation_link');
        expect(client.post.mock.calls[0][1]).toEqual({ email });
      });
    });
    it('sendPasswordResetLink should call client.post auth_password_reset with email', () => {
      const email = 'testing@testing.com';
      return store.dispatch('account/sendPasswordResetLink', email).then(() => {
        expect(client.post.mock.calls[0][0]).toBe('auth_password_reset');
        expect(client.post.mock.calls[0][1]).toEqual({ email });
      });
    });
    it('setPassword should call client.post auth_password_reset_confirm', () => {
      const passwordData = {
        new_password1: 'testing password',
        new_password2: 'testing password',
        token: 'testing token',
        uidb64: 'testing uidb64',
      };
      return store.dispatch('account/setPassword', passwordData).then(() => {
        expect(client.post.mock.calls[0][0]).toBe('auth_password_reset_confirm');
        expect(client.post.mock.calls[0][1]).toEqual({
          new_password1: passwordData.new_password1,
          new_password2: passwordData.new_password2,
        });
      });
    });
  });
});
