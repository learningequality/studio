import { mount } from '@vue/test-utils';
import { factory } from '../../../store';
import router from '../../../router';
import CatalogFilters from '../CatalogFilters';

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
    it('should call setKeywords when keywords change', () => {
      const setKeywordsMock = jest.fn();
      const setKeywords = () => {
        return () => {
          setKeywordsMock();
        };
      };
      wrapper = makeWrapper({ setKeywords });
      const keywords = wrapper.find('[data-test="keywords"]');
      keywords.element.value = 'test';
      keywords.trigger('input');
      expect(setKeywordsMock).toHaveBeenCalled();
    });
    it('keywordInput should stay in sync with query param', () => {
      const keywords = 'testing new keyword';
      router.push({ query: { keywords } });
      wrapper.vm.$nextTick(() => {
        expect(wrapper.vm.keywordInput).toBe(keywords);
      });
    });
  });
});
