import { mount, createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import router from '../../../router';
import { RouteNames } from '../../../constants';
import UserTable from '../UserTable';

const localVue = createLocalVue();

localVue.use(Vuex);
localVue.use(router);

const userList = ['test', 'user', 'table'];

function makeWrapper(store) {
  router.replace({ name: RouteNames.USERS });

  const wrapper = mount(UserTable, {
    router,
    store,
    localVue,
    stubs: {
      UserItem: true,
      EmailUsersDialog: true,
    },
  });

  return wrapper;
}

describe('userTable', () => {
  let wrapper, store;
  const loadUsers = jest.fn(() => Promise.resolve({}));

  beforeEach(() => {
    store = new Store({
      modules: {
        userAdmin: {
          namespaced: true,
          actions: {
            loadUsers,
          },
          getters: {
            users: () => userList,
            count: () => userList.length,
          },
        },
      },
    });
    wrapper = makeWrapper(store);
  });
  afterEach(() => {
    loadUsers.mockRestore();
  });

  describe('filters', () => {
    it('changing user type filter should set query params', () => {
      wrapper.vm.userTypeFilter = 'administrator';
      expect(router.currentRoute.query.userType).toBe('administrator');
    });

    it('changing location filter should set query params', () => {
      wrapper.vm.locationFilter = 'Afghanistan';
      expect(router.currentRoute.query.location).toBe('Afghanistan');
    });

    it('changing search text should set query params', () => {
      jest.useFakeTimers();
      wrapper.vm.keywordInput = 'keyword test';
      wrapper.vm.setKeywords();
      jest.runAllTimers();
      jest.useRealTimers();

      expect(router.currentRoute.query.keywords).toBe('keyword test');
    });
  });

  describe('selection', () => {
    it('selectAll should set selected to channel list', () => {
      wrapper.vm.selectAll = true;
      expect(wrapper.vm.selected).toEqual(userList);
    });

    it('removing selectAll should set selected to empty list', () => {
      wrapper.vm.selected = userList;
      wrapper.vm.selectAll = false;
      wrapper.vm.$nextTick(() => {
        expect(wrapper.vm.selected).toEqual([]);
      });
    });

    it('selectedCount should match the selected length', () => {
      wrapper.vm.selected = ['test'];
      expect(wrapper.vm.selectedCount).toBe(1);
    });

    it('selected should clear on query changes', () => {
      wrapper.vm.selected = ['test'];
      router.push({
        ...wrapper.vm.$route,
        query: {
          param: 'test',
        },
      });
      wrapper.vm.$nextTick(() => {
        expect(wrapper.vm.selected).toEqual([]);
      });
    });
  });

  describe('bulk actions', () => {
    it('should be hidden if no items are selected', () => {
      expect(wrapper.find('[data-test="email"]').exists()).toBe(false);
    });

    it('should be visible if items are selected', async () => {
      wrapper.vm.selected = userList;
      await wrapper.vm.$nextTick();
      expect(wrapper.find('[data-test="email"]').exists()).toBe(true);
    });

    it('email should open email dialog', async () => {
      wrapper.vm.selected = userList;
      await wrapper.vm.$nextTick();
      await wrapper.findComponent('[data-test="email"]').trigger('click');
      expect(wrapper.vm.showEmailDialog).toBe(true);
    });
  });
});
