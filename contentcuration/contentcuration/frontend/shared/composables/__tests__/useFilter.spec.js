/* eslint-disable vue/one-component-per-file */
import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import VueRouter from 'vue-router';
import { useFilter } from '../useFilter';

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

  it('options are correctly computed from filterMap', () => {
    wrapper.vm.filterMap = {
      a: { label: 'A', params: { a: '1', b: '2' } },
      b: { label: 'B', params: { b: '3', c: '4' } },
    };
    expect(wrapper.vm.options).toEqual([
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ]);
  });
});
