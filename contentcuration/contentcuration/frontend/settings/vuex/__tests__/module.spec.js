import settings from '../index';
import storeFactory from 'shared/vuex/baseStore';
import client from 'shared/client';

jest.mock('shared/client');
jest.mock('shared/vuex/connectionPlugin');

describe('settings store', () => {
  let store;
  beforeEach(() => {
    store = storeFactory({
      modules: { settings },
    });
    client.post.mockRestore();
    client.get.mockRestore();
    store.state.session.currentUser = { first_name: 'Test', last_name: 'User' };
  });
  it('exportData should call client.get export_user_data', () => {
    return store.dispatch('settings/exportData').then(() => {
      expect(client.get.mock.calls[0][0]).toBe('export_user_data');
    });
  });
  it('saveFullName should call client.post update_user_full_name', () => {
    const data = {
      first_name: 'Firstname',
      last_name: 'Lastname',
    };
    client.post.mockResolvedValue(Promise.resolve());
    return store.dispatch('settings/saveFullName', data).then(() => {
      expect(client.post.mock.calls[0][0]).toBe('update_user_full_name');
      expect(client.post.mock.calls[0][1]).toEqual(data);
    });
  });
  it('saveFullName should set the store user data', () => {
    const data = {
      first_name: 'Firstname',
      last_name: 'Lastname',
    };
    client.post.mockResolvedValue(Promise.resolve());
    return store.dispatch('settings/saveFullName', data).then(() => {
      expect(store.state.session.currentUser.first_name).toBe(data.first_name);
      expect(store.state.session.currentUser.last_name).toBe(data.last_name);
    });
  });
  it('updateUserPassword should call client.post change_password', () => {
    const data = 'pass';
    return store.dispatch('settings/updateUserPassword', data).then(() => {
      expect(client.post.mock.calls[0][0]).toBe('change_password');
      expect(client.post.mock.calls[0][1]).toEqual({
        new_password1: data,
        new_password2: data,
      });
    });
  });
  it('requestStorage should call client.post request_storage', () => {
    const data = {
      storage: 'test storage',
      kind: 'test kind',
      resource_count: 'test resource_count',
      resource_size: 'test resource_size',
      creators: 'test creators',
      sample_link: 'test sample_link',
      license: 'test license',
      public: 'test public',
      audience: 'test audience',
      location: 'test location',
      import_count: 'test import_count',
      uploading_for: 'test uploading_for',
      organization_type: 'test organization_type',
      time_constraint: 'test time_constraint',
      message: 'test message',
    };
    return store.dispatch('settings/requestStorage', data).then(() => {
      expect(client.post.mock.calls[0][0]).toBe('request_storage');
      expect(client.post.mock.calls[0][1]).toEqual(data);
    });
  });
  it('deleteAccount should call client.post delete_user_account', () => {
    const email = 'emailtodelete@test.com';
    return store.dispatch('settings/deleteAccount', email).then(() => {
      expect(client.post.mock.calls[0][0]).toBe('delete_user_account');
      expect(client.post.mock.calls[0][1]).toEqual({ email });
    });
  });
});
