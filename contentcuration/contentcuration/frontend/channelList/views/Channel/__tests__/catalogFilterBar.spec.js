import { mount } from '@vue/test-utils';
import store from '../../../store';
import router from '../../../router';
import CatalogFilterBar from '../CatalogFilterBar';

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

  describe('public collections', () => {
    it('should list collections if no filters are selected', () => {
      expect(wrapper.find('[data-test="collection"]').exists()).toBe(true);
    });
    it('should filter by collection if one on click', () => {
      wrapper.find('[data-test="collection"]').trigger('click');
      expect(wrapper.vm.collection).toBe(collection.id);
    });
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
    });
    it('removing boolean-based filter should remove it from the query', () => {
      wrapper.vm.resetCoach();
      expect(wrapper.vm.$route.query.coach).toBeUndefined();
    });
    it('removing collection filter should remove it from the query', () => {
      wrapper.vm.resetCollection();
      expect(wrapper.vm.$route.query.collection).toBeUndefined();
    });
    it('removing list-based filter should only remove that item from the query', () => {
      wrapper.vm.removeLanguage('en');
      expect(wrapper.vm.$route.query.languages).toBe('es');

      wrapper.vm.removeLanguage('es');
      expect(wrapper.vm.$route.query.languages).toBeUndefined();
    });
  });
});
