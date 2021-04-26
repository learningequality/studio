import { mount } from '@vue/test-utils';
import { factory } from '../../../store';
import router from '../../../router';
import { RouteNames } from '../../../constants';
import CatalogList from '../CatalogList';

const store = factory();

router.push({ name: RouteNames.CATALOG_ITEMS });

const results = ['channel-1', 'channel-2'];

function makeWrapper(computed = {}, methods = {}) {
  return mount(CatalogList, {
    router,
    store,
    computed: {
      page() {
        return {
          count: results.length,
          results,
        };
      },
      ...computed,
    },
    methods,
    stubs: {
      CatalogFilters: true,
    },
  });
}

describe('catalogFilterBar', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
    wrapper.setData({ loading: false });
  });

  it('should call loadCatalog on mount', () => {
    const loadCatalog = jest.fn();
    wrapper = makeWrapper({}, { loadCatalog });
    expect(loadCatalog).toHaveBeenCalled();
  });

  describe('on query change', () => {
    const searchCatalogMock = jest.fn();

    beforeEach(() => {
      router.replace({ query: {} });
      searchCatalogMock.mockReset();
      wrapper = makeWrapper({
        debouncedSearch() {
          return searchCatalogMock;
        },
      });
    });
    it('should call debouncedSearch', () => {
      const keywords = 'search catalog test';
      router.push({ query: { keywords } });
      wrapper.vm.$nextTick(() => {
        expect(searchCatalogMock).toHaveBeenCalled();
      });
    });
    it('should reset excluded if a filter changed', () => {
      const keywords = 'search reset test';
      wrapper.setData({ excluded: ['item 1'] });
      router.push({ query: { keywords } });
      wrapper.vm.$nextTick(() => {
        expect(wrapper.vm.excluded).toEqual([]);
      });
    });
    it('should keep excluded if page number changed', () => {
      wrapper.setData({ excluded: ['item 1'] });
      router.push({
        query: {
          ...wrapper.vm.$route.query,
          page: 2,
        },
      });
      wrapper.vm.$nextTick(() => {
        expect(wrapper.vm.excluded).toEqual(['item 1']);
      });
    });
  });

  describe('download workflow', () => {
    describe('toggling selection mode', () => {
      it('checkboxes and toolbar should be hidden if selecting is false', () => {
        expect(wrapper.find('[data-test="checkbox"]').exists()).toBe(false);
        expect(wrapper.find('[data-test="toolbar"]').exists()).toBe(false);
      });
      it('should activate when select button is clicked', () => {
        wrapper.find('[data-test="select"]').trigger('click');
        expect(wrapper.vm.selecting).toBe(true);
      });
      it('clicking cancel should exit selection mode', () => {
        wrapper.setData({ selecting: true });
        wrapper.find('[data-test="cancel"]').trigger('click');
        expect(wrapper.vm.selecting).toBe(false);
      });
      it('excluded should reset when selection mode is exited', () => {
        wrapper.setData({ selecting: true, excluded: ['item-1', 'item-2'] });
        wrapper.vm.setSelection(false);
        expect(wrapper.vm.excluded).toHaveLength(0);
      });
    });

    describe('selecting channels', () => {
      const excluded = ['item-1'];
      beforeEach(() => {
        wrapper.setData({
          selecting: true,
          excluded,
        });
      });
      it('selecting all should select all items on the page', () => {
        wrapper.setData({ excluded: excluded.concat(results) });
        wrapper.vm.selectAll = true;
        expect(wrapper.vm.excluded).toEqual(excluded);
        expect(wrapper.vm.selected).toEqual(results);
      });
      it('deselecting all should select all items on the page', () => {
        wrapper.vm.selectAll = false;
        expect(wrapper.vm.excluded).toEqual(excluded.concat(results));
        expect(wrapper.vm.selected).toEqual([]);
      });
      it('selecting a channel should remove it from excluded', () => {
        wrapper.setData({ excluded: excluded.concat(results) });
        wrapper.vm.selected = [results[0]];
        expect(wrapper.vm.excluded).toEqual(excluded.concat([results[1]]));
        expect(wrapper.vm.selected).toEqual([results[0]]);
      });
      it('deselecting a channel should add it to excluded', () => {
        wrapper.vm.selected = [results[0]];
        expect(wrapper.vm.excluded).toEqual(excluded.concat([results[1]]));
        expect(wrapper.vm.selected).toEqual([results[0]]);
      });
    });

    describe('download csv', () => {
      const downloadChannelsCSV = jest.fn();
      const excluded = ['item-1', 'item-2'];
      beforeEach(() => {
        downloadChannelsCSV.mockReset();
        wrapper.setData({ selecting: true, excluded });
        wrapper.setMethods({ downloadChannelsCSV });
      });
      it('clicking download CSV should call downloadCSV', () => {
        const downloadCSV = jest.fn();
        wrapper.setMethods({ downloadCSV });
        wrapper.find('[data-test="download-csv"]').trigger('click');
        expect(downloadCSV).toHaveBeenCalled();
      });
      it('downloadCSV should call downloadChannelsCSV with current parameters', () => {
        const keywords = 'Download csv keywords test';
        router.replace({ query: { keywords } });
        wrapper.vm.downloadCSV();
        expect(downloadChannelsCSV.mock.calls[0][0].keywords).toBe(keywords);
      });
      it('downloadCSV should call downloadChannelsCSV with list of excluded items', () => {
        wrapper.vm.downloadCSV();
        expect(downloadChannelsCSV.mock.calls[0][0].excluded).toEqual(excluded);
      });
      it('downloadCSV should exit selection mode', () => {
        wrapper.vm.downloadCSV();
        expect(wrapper.vm.selecting).toBe(false);
      });
    });
  });
});
