import { mount } from '@vue/test-utils';
import router from '../../../router';
import { factory } from '../../../store';
import { RouteNames } from '../../../constants';
import UserTable from '../UserTable';

const store = factory();

const loadUsers = jest.fn().mockReturnValue(Promise.resolve());
const userList = ['test', 'user', 'table'];
function makeWrapper() {
  router.replace({ name: RouteNames.USERS });
  return mount(UserTable, {
    router,
    store,
    sync: false,
    computed: {
      count() {
        return 10;
      },
      users() {
        return userList;
      },
    },
    methods: {
      loadUsers,
    },
    stubs: {
      UserItem: true,
      EmailUsersDialog: true,
    },
  });
}

describe('userTable', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  describe('filters', () => {
    it('changing filter should set query params', () => {
      wrapper.vm.filter = 'administrator';
      expect(Boolean(router.currentRoute.query.is_admin)).toBe(true);
    });
    it('changing location should set query params', () => {
      wrapper.vm.location = 'Afghanistan';
      expect(router.currentRoute.query.location).toBe('Afghanistan');
    });
    it('changing search text should set query params', () => {
      wrapper.vm.keywords = 'keyword test';
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
    it('should be visible if items are selected', () => {
      wrapper.vm.selected = userList;
      wrapper.vm.$nextTick(() => {
        expect(wrapper.find('[data-test="email"]').exists()).toBe(true);
      });
    });
    it('email should open email dialog', () => {
      wrapper.vm.selected = userList;
      wrapper.vm.$nextTick(() => {
        wrapper.find('[data-test="email"] .v-btn').trigger('click');
        expect(wrapper.vm.showEmailDialog).toBe(true);
      });
    });
  });
});
