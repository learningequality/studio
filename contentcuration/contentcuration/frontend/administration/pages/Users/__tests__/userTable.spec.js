import { mount, createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import router from '../../../router';
import { RouteNames } from '../../../constants';
import UserTable from '../UserTable';

jest.mock('shared/client', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
jest.mock('file-saver', () => ({ saveAs: jest.fn() }));

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

    it('changing joined-within filter sets joined_since query param to an ISO date', () => {
      wrapper.vm.joinedWithinFilter = '3mo';
      const params = wrapper.vm.filterFetchQueryParams;
      expect(params.joined_since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('changing active-within filter sets active_since query param to an ISO date', () => {
      wrapper.vm.activeWithinFilter = '1mo';
      const params = wrapper.vm.filterFetchQueryParams;
      expect(params.active_since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('toggling has-published filter sets published_channel=true', () => {
      wrapper.vm.hasPublishedFilter = true;
      const params = wrapper.vm.filterFetchQueryParams;
      expect(params.published_channel).toBe(true);
    });

    it('toggling has-edits filter sets has_edits=true', () => {
      wrapper.vm.hasEditsFilter = true;
      const params = wrapper.vm.filterFetchQueryParams;
      expect(params.has_edits).toBe(true);
    });
  });

  describe('clearing filters', () => {
    it('is disabled while no filter is applied', () => {
      expect(wrapper.vm.hasActiveFilters).toBe(false);
      expect(wrapper.findComponent('[data-test="clear-filters"]').props().disabled).toBe(true);
    });

    it('is enabled once a filter is applied', async () => {
      wrapper.vm.userTypeFilter = 'administrator';
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.hasActiveFilters).toBe(true);
      expect(wrapper.findComponent('[data-test="clear-filters"]').props().disabled).toBe(false);
    });

    it('is enabled by a user type of "All", which narrows nothing but is still a selection', async () => {
      wrapper.vm.userTypeFilter = 'all';
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.filterFetchQueryParams).toEqual({});
      expect(wrapper.vm.hasActiveFilters).toBe(true);
      expect(wrapper.findComponent('[data-test="clear-filters"]').props().disabled).toBe(false);
    });

    it('stays disabled for date windows left at their default', async () => {
      wrapper.vm.joinedWithinFilter = 'any';
      wrapper.vm.activeWithinFilter = 'any';
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.hasActiveFilters).toBe(false);
    });

    it('stays disabled after a checkbox is ticked and unticked again', async () => {
      wrapper.vm.hasPublishedFilter = true;
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.hasActiveFilters).toBe(true);

      wrapper.vm.hasPublishedFilter = false;
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.hasActiveFilters).toBe(false);
    });

    it('drops every filter, including the keyword search', async () => {
      jest.useFakeTimers();
      wrapper.vm.keywordInput = 'keyword test';
      wrapper.vm.setKeywords();
      jest.runAllTimers();
      jest.useRealTimers();

      wrapper.vm.userTypeFilter = 'administrator';
      wrapper.vm.locationFilter = 'Afghanistan';
      wrapper.vm.joinedWithinFilter = '3mo';
      wrapper.vm.activeWithinFilter = '1mo';
      wrapper.vm.hasPublishedFilter = true;
      wrapper.vm.hasEditsFilter = true;
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.filterFetchQueryParams).not.toEqual({});

      await wrapper.findComponent('[data-test="clear-filters"]').trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.filterFetchQueryParams).toEqual({});
      expect(wrapper.vm.keywordInput).toBe('');
      expect(Object.keys(router.currentRoute.query).sort()).toEqual([
        'descending',
        'page',
        'page_size',
        'sortBy',
      ]);
    });

    it('preserves pagination and sorting', async () => {
      wrapper.vm.pagination = { ...wrapper.vm.pagination, page: 3, sortBy: 'email' };
      wrapper.vm.userTypeFilter = 'administrator';
      await wrapper.vm.$nextTick();

      wrapper.vm.clearFilters();
      await wrapper.vm.$nextTick();

      expect(router.currentRoute.query.sortBy).toBe('email');
      expect(router.currentRoute.query.userType).toBeUndefined();
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

  describe('csv download', () => {
    beforeEach(() => {
      const client = require('shared/client').default;
      const { saveAs } = require('file-saver');
      client.get.mockReset();
      client.get.mockResolvedValue({
        data: new Blob(['col1,col2\n1,2'], { type: 'text/csv' }),
      });
      saveAs.mockClear();
    });

    it('renders the Download CSV button when count > 0', () => {
      expect(wrapper.find('[data-test="csv"]').exists()).toBe(true);
    });

    it('clicking Download CSV calls the API with the current filter params', async () => {
      await wrapper.findComponent('[data-test="csv"]').trigger('click');
      // Flush the microtask queue so the chained .then() runs.
      await new Promise(resolve => setImmediate(resolve));

      const client = require('shared/client').default;
      const { saveAs } = require('file-saver');
      expect(client.get).toHaveBeenCalled();
      const [, options] = client.get.mock.calls[0];
      expect(options.responseType).toBe('blob');
      expect(saveAs).toHaveBeenCalled();
      const [savedBlob, savedName] = saveAs.mock.calls[0];
      expect(savedBlob).toBeInstanceOf(Blob);
      expect(savedName).toMatch(/^studio_users_\d{4}-\d{2}-\d{2}\.csv$/);
    });
  });

  describe('csv download disabled state', () => {
    it('disables Download CSV when count is zero', () => {
      const emptyStore = new Store({
        modules: {
          userAdmin: {
            namespaced: true,
            actions: { loadUsers },
            getters: {
              users: () => [],
              count: () => 0,
            },
          },
        },
      });
      const emptyWrapper = makeWrapper(emptyStore);
      const button = emptyWrapper.find('[data-test="csv"]');
      expect(button.attributes('disabled') !== undefined || button.props().disabled).toBe(true);
    });
  });
});
