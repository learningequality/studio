import { mount } from '@vue/test-utils';
import { factory } from '../../../store';
import router from '../../../router';
import CatalogFilters from '../CatalogFilters';
import CatalogFilterPanelContent from '../CatalogFilterPanelContent';

const store = factory();

function makeWrapper(computed = {}) {
  return mount(CatalogFilters, {
    sync: false,
    router,
    store,
    computed,
    stubs: {
      CatalogFilterBar: true,
    },
  });
}

describe('catalogFilters', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });

  describe('keywords', () => {
    it('should update keywords data when updateKeywords is called', async () => {
      wrapper = mount(CatalogFilterPanelContent, {
        sync: false,
        router,
        store,
      });

      await wrapper.setData({ keywordInput: 'initial value' });

      wrapper.vm.updateKeywords();

      expect(wrapper.vm.keywords).toBe('initial value');
    });

    it('keywordInput should sync with route query parameters on mount', async () => {
      const keywords = 'route keywords';
      await router.push({ query: { keywords } });

      wrapper = mount(CatalogFilterPanelContent, {
        sync: false,
        router,
        store,
      });

      expect(wrapper.vm.keywordInput).toBe(keywords);
    });

    it('keywordInput should update when route query parameters change', async () => {
      wrapper = mount(CatalogFilterPanelContent, {
        sync: false,
        router,
        store,
      });

      const keywords = 'new route keywords';
      await router.push({ query: { keywords } });

      expect(wrapper.vm.keywordInput).toBe(keywords);
    });
  });
});
