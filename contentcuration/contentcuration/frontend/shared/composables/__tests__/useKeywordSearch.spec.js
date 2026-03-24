/* eslint-disable vue/one-component-per-file */
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import { useKeywordSearch } from '../useKeywordSearch';

// Because we are testing composables that use the router,
// we need to create a dummy component that uses the composable
// and test that component with a router instance.

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
