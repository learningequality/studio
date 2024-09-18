import { mount } from '@vue/test-utils';
import { factory } from '../../../store';
import router from '../../../router';
import CatalogFilterBar from '../CatalogFilterBar';

const store = factory();

const collection = {
  id: 'test-collection',
};

const query = {
  keywords: 'testing',
  languages: 'en,es',
  coach: true,
  collection: 'some-collection',
};

function makeWrapper() {
  return mount(CatalogFilterBar, {
    sync: false,
    router,
    store,
    computed: {
      collections() {
        return [collection];
      },
    },
  });
}

describe('catalogFilterBar', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });

  describe('removing filters', () => {
    beforeEach(() => {
      Object.entries(query).forEach(([key, val]) => {
        wrapper.vm[key] = val;
      });
      router.replace({ query });
    });
    it('clear all button should remove all filters', () => {
      wrapper.find('[data-test="clear"]').trigger('click');
      expect(wrapper.keywords).toBeUndefined();
      expect(wrapper.vm.currentFilters).toHaveLength(0);
    });
    it('removing text-based filter should remove it from the query', () => {
      wrapper.vm.resetKeywords();
      expect(wrapper.vm.$route.query.keywords).toBeUndefined();

      // Make sure other queries weren't affected
      expect(wrapper.vm.$route.query.coach).toBeTruthy();
      expect(wrapper.vm.$route.query.collection).toBeTruthy();
      expect(wrapper.vm.$route.query.languages).toBeTruthy();
    });
    it('removing boolean-based filter should remove it from the query', () => {
      wrapper.vm.resetCoach();
      expect(wrapper.vm.$route.query.coach).toBeUndefined();

      // Make sure other queries weren't affected
      expect(wrapper.vm.$route.query.collection).toBeTruthy();
      expect(wrapper.vm.$route.query.languages).toBeTruthy();
      expect(wrapper.vm.$route.query.keywords).toBeTruthy();
    });
    it('removing list-based filter should only remove that item from the query', () => {
      wrapper.vm.removeLanguage('en');
      expect(wrapper.vm.$route.query.languages).toBe('es');

      wrapper.vm.removeLanguage('es');
      expect(wrapper.vm.$route.query.languages).toBeUndefined();

      // Make sure other queries weren't affected
      expect(wrapper.vm.$route.query.coach).toBeTruthy();
      expect(wrapper.vm.$route.query.collection).toBeTruthy();
      expect(wrapper.vm.$route.query.keywords).toBeTruthy();
    });
  });
});
