import userAdmin from '../index';
import storeFactory from 'shared/vuex/baseStore';
import client from 'shared/client';

jest.mock('shared/client');
jest.mock('shared/vuex/connectionPlugin');

const userId = 'testId';

describe('user admin actions', () => {
  let store;
  beforeEach(() => {
    store = storeFactory({
      modules: {
        userAdmin,
      },
    });
    store.state.session.currentUser.id = userId;
    client.get.mockClear();
    client.post.mockClear();
    client.delete.mockClear();
    client.patch.mockClear();
  });

  describe('getters', () => {
    const testList = ['test', 'user', 'list'];
    const testId = 'test-user-id';
    beforeEach(() => {
      store.state.userAdmin.pageData = {
        results: testList,
        count: testList.length,
      };
      store.state.userAdmin.usersMap = {
        [userId]: 'ME',
        [testId]: 'TEST',
      };
    });
    it('count should return page result count', () => {
      expect(store.getters['userAdmin/count']).toEqual(testList.length);
    });
    it('users should return page results', () => {
      expect(store.getters['userAdmin/users']).toEqual(testList);
    });
    it('getUser should get the user from the map', () => {
      expect(store.getters['userAdmin/getUser'](testId)).toBe('TEST');
    });
    it('getUsers should return matching items from map', () => {
      expect(store.getters['userAdmin/getUsers']([testId, userId])).toEqual(['TEST', 'ME']);
    });
  });
  describe('mutations', () => {
    const testUser = { id: 'TESTING', testing: 'data1' };
    const testUser2 = { id: 'LIST', testing: 'data2' };
    const testList = [testUser, testUser2];

    it('SET_PAGE_DATA should set the page data', () => {
      const testPage = {
        count: 100,
        total_pages: 5,
        results: [testUser],
        page_number: 1,
      };
      store.commit('userAdmin/SET_PAGE_DATA', testPage);
      expect(store.state.userAdmin.pageData).toEqual({
        ...testPage,
        next: null,
        previous: null,
        results: [testUser.id],
      });
    });
    it('ADD_USERS should set the page data', () => {
      store.commit('userAdmin/ADD_USERS', testList);
      expect(store.state.userAdmin.usersMap).toEqual({
        TESTING: testUser,
        LIST: testUser2,
      });
    });
    it('UPDATE_USER should overwrite fields in map', () => {
      const newData = { id: 'TESTING', testing: 'new' };
      store.commit('userAdmin/ADD_USERS', testList);
      store.commit('userAdmin/UPDATE_USER', newData);
      expect(store.state.userAdmin.usersMap).toEqual({
        TESTING: newData,
        LIST: testUser2,
      });
    });
    it('REMOVE_USER should remove user from pageData and usersMap', () => {
      store.commit('userAdmin/ADD_USERS', testList);
      store.commit('userAdmin/SET_PAGE_DATA', { results: [testUser, testUser2], count: 1 });
      store.commit('userAdmin/REMOVE_USER', testUser.id);

      expect(store.state.userAdmin.usersMap).toEqual({ LIST: testUser2 });
      expect(store.state.userAdmin.pageData.results).toEqual([testUser2.id]);
      expect(store.state.userAdmin.pageData.count).toBe(0);
    });
  });
  describe('actions', () => {
    it('loadUser should call client.get with admin_users_detail', () => {
      return store.dispatch('userAdmin/loadUser', userId).then(() => {
        expect(client.get).toHaveBeenCalledWith('admin_users_detail');
      });
    });
    it('loadUserDetails should call client.get with get_user_details', () => {
      return store.dispatch('userAdmin/loadUserDetails', userId).then(() => {
        expect(client.get).toHaveBeenCalledWith('admin_users_metadata');
      });
    });

    describe('loadUsers', () => {
      beforeEach(() => {
        client.get.mockReturnValue(
          Promise.resolve({
            data: { results: [] },
          }),
        );
      });
      it('should call client.get with admin_users_list', () => {
        return store.dispatch('userAdmin/loadUsers', {}).then(() => {
          expect(client.get.mock.calls[0][0]).toBe('admin_users_list');
        });
      });
      it('should call client.get with queries', () => {
        const keywords = 'testing';
        return store.dispatch('userAdmin/loadUsers', { keywords }).then(() => {
          expect(client.get.mock.calls[0][1].params.keywords).toBe(keywords);
        });
      });
    });
    // TODO: client mock isn't working from within the resource layer
    //       Uncomment this once it's fixed
    // it('updateUser should update the user with the given data', () => {
    //   const testData = { id: userId, is_admin: false };
    //   return store.dispatch('userAdmin/updateUser', testData).then(() => {
    //     expect(client.patch).toHaveBeenCalledWith('admin_users_detail');
    //   });
    // });
    it('sendEmail should call client.post with send_custom_email', () => {
      const email = {
        query: { test: 'testemail@test.com' },
        subject: 'Subject',
        message: 'Test email body',
      };
      return store.dispatch('userAdmin/sendEmail', email).then(() => {
        expect(client.post.mock.calls[0][0]).toBe('send_custom_email');
        expect(client.post.mock.calls[0][1]).toEqual(email);
      });
    });
    it('deleteUser should call client.delete with admin_users_detail', () => {
      return store.dispatch('userAdmin/deleteUser', userId).then(() => {
        expect(client.delete).toHaveBeenCalledWith('admin_users_detail');
      });
    });
  });
});
