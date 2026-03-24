/* eslint-disable vue/one-component-per-file */
import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import { useTable } from '../useTable';

// Because we are testing composables that use the router,
// we need to create a dummy component that uses the composable
// and test that component with a router instance.

function makeTableWrapper() {
  const router = new VueRouter({
    routes: [],
  });
  const component = defineComponent({
    setup() {
      const filterFetchQueryParams = ref({});
      const fetchFunc = jest.fn(() => Promise.resolve({}));
      return {
        ...useTable({
          fetchFunc,
          filterFetchQueryParams,
        }),
        // eslint-disable-next-line vue/no-unused-properties
        filterFetchQueryParams,
        // eslint-disable-next-line vue/no-unused-properties
        fetchFunc,
      };
    },
  });

  return mount(component, {
    router,
  });
}

describe('useTable', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeTableWrapper();
    wrapper.vm.$router.push({ query: {} }).catch(() => {});
  });

  it('changing pagination updates query params', () => {
    wrapper.vm.pagination = {
      page: 2,
      rowsPerPage: 50,
      descending: true,
      totalItems: 10,
      sortBy: 'name',
    };
    expect(wrapper.vm.$route.query).toEqual({
      page: '2',
      page_size: '50',
      descending: 'true',
      sortBy: 'name',
    });
  });

  it('changing query params updates pagination', async () => {
    wrapper.vm.$router.push({
      query: { page: '3', page_size: '75', descending: 'true', sortBy: 'name' },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.pagination).toEqual({
      page: 3,
      rowsPerPage: 75,
      descending: true,
      sortBy: 'name',
    });
  });

  it('changing filterFetchQueryParams updates pagination to first page', async () => {
    wrapper.vm.pagination = { page: 3, rowsPerPage: 50 };
    wrapper.vm.filterFetchQueryParams = { a: '1' };

    await wrapper.vm.$nextTick();
    expect(wrapper.vm.pagination).toEqual({ page: 1, rowsPerPage: 50 });
  });

  describe('fetchFunc', () => {
    it('is called in the beginning', async () => {
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.fetchFunc).toHaveBeenCalled();
    });

    it('is called when pagination changes', async () => {
      await wrapper.vm.$nextTick();
      wrapper.vm.fetchFunc.mockClear();

      wrapper.vm.pagination = { page: 2, rowsPerPage: 50 };

      // Needs two ticks, because inside the watcher dealing with this
      // nextTick is also used
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.fetchFunc).toHaveBeenCalled();
    });

    it('is called when filterFetchQueryParams change', async () => {
      await wrapper.vm.$nextTick();
      wrapper.vm.fetchFunc.mockClear();

      wrapper.vm.filterFetchQueryParams = { a: '1' };

      // Needs two ticks, because inside the watcher dealing with this
      // nextTick is also used
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.fetchFunc).toHaveBeenCalled();
    });

    it('is called with correct params', async () => {
      await wrapper.vm.$nextTick();
      wrapper.vm.fetchFunc.mockClear();

      wrapper.vm.filterFetchQueryParams = { a: '1' };
      await wrapper.vm.$nextTick();
      wrapper.vm.pagination = {
        page: 2,
        rowsPerPage: 50,
        descending: true,
        sortBy: 'name',
        totalItems: 10,
      };

      // Needs two ticks, because inside the watcher dealing with this
      // nextTick is also used
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.fetchFunc).toHaveBeenCalledWith({
        a: '1',
        page: 2,
        page_size: 50,
        ordering: '-name',
      });
    });
  });
});
