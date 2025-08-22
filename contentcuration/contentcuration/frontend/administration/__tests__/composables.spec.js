/* eslint-disable vue/one-component-per-file */
import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';

import VueRouter from 'vue-router';
import { useFilter, useKeywordSearch } from '../composables';

// Because we are testing a composable that uses the router,
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
        ...useFilter(filterMap),
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
    wrapper.vm.$router.push({ query: { c: '1', d: '2' } });

    wrapper.vm.filter = 'a';
    expect(wrapper.vm.$route.query).toEqual({ a: '1', b: '2', d: '2', page: '1' });
  });

  describe('filter is determined from query params', () => {
    it('when filter params are provided', () => {
      wrapper.vm.filterMap = {
        a: { label: 'A', params: { a: '1', b: '2' } },
        b: { label: 'B', params: { b: '3', c: '4' } },
      };
      wrapper.vm.$router.push({ query: { a: '1', b: '2', d: '2' } });
      expect(wrapper.vm.filter).toBe('a');
    });

    it('when no filter params are provided, but an item has no params in filterMap', () => {
      wrapper.vm.filterMap = {
        a: { label: 'A', params: { a: '1', b: '2' } },
        b: { label: 'B', params: {} },
      };
      wrapper.vm.$router.push({ query: { d: '2' } });
      expect(wrapper.vm.filter).toBe('b');
    });

    it('when no filter params are provided, and no item has no params in filterMap', () => {
      wrapper.vm.filterMap = {
        a: { label: 'A', params: { a: '1', b: '2' } },
        b: { label: 'B', params: { b: '3', c: '4' } },
      };
      wrapper.vm.$router.push({ query: { d: '2' } });
      expect(wrapper.vm.filter).toBe(null);
    });
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

    expect(wrapper.vm.$route.query).toEqual({ a: '1', keywords: 'test', page: '1' });
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
    expect(wrapper.vm.$route.query).toEqual({ a: '1', page: '1' });
  });
});
