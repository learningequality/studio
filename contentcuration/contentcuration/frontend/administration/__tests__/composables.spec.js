/* eslint-disable vue/one-component-per-file */
import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';

import VueRouter from 'vue-router';
import { useFilter, useKeywordSearch, useTable } from '../composables';

// Because we are testing composables that use the router,
// we need to create a dummy component that uses the composable
// and test that component with a router instance.

function makeFilterWrapper() {
  const router = new VueRouter({
    routes: [],
  });
  const component = defineComponent({
    setup() {
      const filterMap = ref({});
      return {
        ...useFilter({ name: 'testFilter', filterMap }),
        // eslint-disable-next-line vue/no-unused-properties
        filterMap,
      };
    },
  });

  return mount(component, {
    router,
  });
}

function makeKeywordSearchWrapper() {
  const router = new VueRouter({
    routes: [],
  });
  const component = defineComponent({
    setup() {
      return {
        ...useKeywordSearch(),
      };
    },
  });

  return mount(component, {
    router,
  });
}

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

describe('useFilter', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeFilterWrapper();
    wrapper.vm.$router.push({ query: {} }).catch(() => {});
  });

  it('setting filter sets query params', () => {
    wrapper.vm.filterMap = {
      a: { label: 'A', params: { a: '1', b: '2' } },
      b: { label: 'B', params: { b: '3', c: '4' } },
    };
    wrapper.vm.$router.push({ query: { testFilter: 'b', otherParam: 'value' } });

    wrapper.vm.filter = 'a';
    expect(wrapper.vm.$route.query).toEqual({ testFilter: 'a', otherParam: 'value' });
  });

  describe('filter is determined from query params', () => {
    it('when filter params are provided', () => {
      wrapper.vm.filterMap = {
        a: { label: 'A', params: { a: '1', b: '2' } },
        b: { label: 'B', params: { b: '3', c: '4' } },
      };
      wrapper.vm.$router.push({ query: { testFilter: 'a', otherParam: 'value' } });
      expect(wrapper.vm.filter).toBe('a');
    });

    it('when filter params are not provided', () => {
      wrapper.vm.filterMap = {
        a: { label: 'A', params: { a: '1', b: '2' } },
        b: { label: 'B', params: { b: '3', c: '4' } },
      };
      wrapper.vm.$router.push({ query: { otherParam: 'value' } });
      expect(wrapper.vm.filter).toBe(undefined);
    });
  });

  it('setting the filter updates fetch query params', () => {
    wrapper.vm.filterMap = {
      a: { label: 'A', params: { a: '1', b: '2' } },
      b: { label: 'B', params: { b: '3', c: '4' } },
    };
    wrapper.vm.filter = 'a';
    expect(wrapper.vm.fetchQueryParams).toEqual({ a: '1', b: '2' });
  });

  it('filters are correctly computed from filterMap', () => {
    wrapper.vm.filterMap = {
      a: { label: 'A', params: { a: '1', b: '2' } },
      b: { label: 'B', params: { b: '3', c: '4' } },
    };
    expect(wrapper.vm.filters).toEqual([
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ]);
  });
});

describe('useKeywordSearch', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeKeywordSearchWrapper();
    wrapper.vm.$router.push({ query: {} }).catch(() => {});
  });

  it('setting keywords sets query params', () => {
    wrapper.vm.$router.push({ query: { a: '1', page: '2' } });
    wrapper.vm.keywordInput = 'test';

    jest.useFakeTimers();
    wrapper.vm.setKeywords();
    jest.runAllTimers();
    jest.useRealTimers();

    expect(wrapper.vm.$route.query).toEqual({ a: '1', keywords: 'test', page: '2' });
  });

  it('setting query params sets keywords', async () => {
    wrapper.vm.$router.push({ query: { keywords: 'test' } });
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.keywordInput).toBe('test');
  });

  it('calling clearSearch clears keywords and query param', async () => {
    wrapper.vm.$router.push({ query: { keywords: 'test', a: '1', page: '2' } });
    await wrapper.vm.$nextTick();

    wrapper.vm.clearSearch();
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.keywordInput).toBe('');
    expect(wrapper.vm.$route.query).toEqual({ a: '1', page: '2' });
  });

  it('setting keywords updates fetch query params', () => {
    wrapper.vm.keywordInput = 'test';

    jest.useFakeTimers();
    wrapper.vm.setKeywords();
    jest.runAllTimers();
    jest.useRealTimers();

    expect(wrapper.vm.fetchQueryParams).toEqual({ keywords: 'test' });
  });
});

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
