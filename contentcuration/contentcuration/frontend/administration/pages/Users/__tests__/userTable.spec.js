import { mount } from '@vue/test-utils';
import router from '../../../router';
import { factory } from '../../../store';
import { RouteNames } from '../../../constants';
import UserTable from '../UserTable';

const store = factory();

const userList = ['test', 'user', 'table'];

function makeWrapper() {
  const loadItems = jest.spyOn(UserTable.mixins[0].methods, '_loadItems');
  loadItems.mockImplementation(() => Promise.resolve());

  router.replace({ name: RouteNames.USERS });

  const wrapper = mount(UserTable, {
    router,
    store,
    computed: {
      count() {
        return 10;
      },
      users() {
        return userList;
      },
    },
    stubs: {
      UserItem: true,
      EmailUsersDialog: true,
    },
  });

  return [wrapper, loadItems];
}

describe('userTable', () => {
  let wrapper, loadUsers;

  beforeEach(() => {
    [wrapper, loadUsers] = makeWrapper();
  });
  afterEach(() => {
    loadUsers.mockRestore();
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
