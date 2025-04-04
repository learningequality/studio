import { mount } from '@vue/test-utils';
import { factory } from '../../../store';
import router from '../../../router';
import { RouteNames } from '../../../constants';
import CatalogList from '../CatalogList';

const store = factory();

router.push({ name: RouteNames.CATALOG_ITEMS });

const results = ['channel-1', 'channel-2'];

function makeWrapper(computed = {}) {
  const loadCatalog = jest.spyOn(CatalogList.methods, 'loadCatalog');
  loadCatalog.mockImplementation(() => Promise.resolve());

  const downloadCSV = jest.spyOn(CatalogList.methods, 'downloadCSV');

  const wrapper = mount(CatalogList, {
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
    stubs: {
      CatalogFilters: true,
    },
  });
  return [wrapper, { loadCatalog, downloadCSV }];
}

describe('catalogFilterBar', () => {
  let wrapper, mocks;

  beforeEach(async () => {
    [wrapper, mocks] = makeWrapper();
    await wrapper.setData({ loading: false });
  });

  it('should call loadCatalog on mount', () => {
    [wrapper, mocks] = makeWrapper();
    expect(mocks.loadCatalog).toHaveBeenCalled();
  });

  describe('on query change', () => {
    const searchCatalogMock = jest.fn();

    beforeEach(() => {
      router.replace({ query: {} }).catch(() => {});
      searchCatalogMock.mockReset();
      [wrapper, mocks] = makeWrapper({
        debouncedSearch() {
          return searchCatalogMock;
        },
      });
    });

    it('should call debouncedSearch', async () => {
      const keywords = 'search catalog test';
      router.push({ query: { keywords } }).catch(() => {});
      await wrapper.vm.$nextTick();
      expect(searchCatalogMock).toHaveBeenCalled();
    });

    it('should reset excluded if a filter changed', async () => {
      const keywords = 'search reset test';
      await wrapper.setData({ excluded: ['item 1'] });
      router.push({ query: { keywords } }).catch(() => {});
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.excluded).toEqual([]);
    });

    it('should keep excluded if page number changed', async () => {
      await wrapper.setData({ excluded: ['item 1'] });
      router
        .push({
          query: {
            ...wrapper.vm.$route.query,
            page: 2,
          },
        })
        .catch(() => {});
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.excluded).toEqual(['item 1']);
    });
  });

  describe('download workflow', () => {
    describe('toggling selection mode', () => {
      it('checkboxes and toolbar should be hidden if selecting is false', () => {
        expect(wrapper.findComponent('[data-test="checkbox"]').exists()).toBe(false);
        expect(wrapper.findComponent('[data-test="toolbar"]').exists()).toBe(false);
      });

      it('should activate when select button is clicked', async () => {
        await wrapper.findComponent('[data-test="select"]').trigger('click');
        expect(wrapper.vm.selecting).toBe(true);
      });

      it('clicking cancel should exit selection mode', async () => {
        await wrapper.setData({ selecting: true });
        await wrapper.findComponent('[data-test="cancel"]').trigger('click');
        expect(wrapper.vm.selecting).toBe(false);
      });

      it('excluded should reset when selection mode is exited', async () => {
        await wrapper.setData({ selecting: true, excluded: ['item-1', 'item-2'] });
        wrapper.vm.setSelection(false);
        expect(wrapper.vm.excluded).toHaveLength(0);
      });
    });

    describe('selecting channels', () => {
      const excluded = ['item-1'];

      beforeEach(async () => {
        await wrapper.setData({
          selecting: true,
          excluded,
        });
      });

      it('selecting all should select all items on the page', async () => {
        await wrapper.setData({ excluded: excluded.concat(results) });
        wrapper.vm.selectAll = true;
        expect(wrapper.vm.excluded).toEqual(excluded);
        expect(wrapper.vm.selected).toEqual(results);
      });

      it('deselecting all should select all items on the page', () => {
        wrapper.vm.selectAll = false;
        expect(wrapper.vm.excluded).toEqual(excluded.concat(results));
        expect(wrapper.vm.selected).toEqual([]);
      });

      it('selecting a channel should remove it from excluded', async () => {
        await wrapper.setData({ excluded: excluded.concat(results) });
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
      let downloadChannelsCSV;
      const excluded = ['item-1', 'item-2'];

      beforeEach(async () => {
        await wrapper.setData({ selecting: true, excluded });
        downloadChannelsCSV = jest.spyOn(wrapper.vm, 'downloadChannelsCSV');
        downloadChannelsCSV.mockImplementation(() => Promise.resolve());
      });

      it('clicking download CSV should call downloadCSV', async () => {
        mocks.downloadCSV.mockImplementationOnce(() => Promise.resolve());
        await wrapper.findComponent('[data-test="download-csv"]').trigger('click');
        expect(mocks.downloadCSV).toHaveBeenCalled();
      });

      it('downloadCSV should call downloadChannelsCSV with current parameters', async () => {
        const keywords = 'Download csv keywords test';
        router.replace({ query: { keywords } });
        await wrapper.vm.downloadCSV();
        expect(downloadChannelsCSV.mock.calls[0][0].keywords).toBe(keywords);
      });

      it('downloadCSV should call downloadChannelsCSV with list of excluded items', async () => {
        await wrapper.vm.downloadCSV();
        expect(downloadChannelsCSV.mock.calls[0][0].excluded).toEqual(excluded);
      });

      it('downloadCSV should exit selection mode', async () => {
        await wrapper.vm.downloadCSV();
        expect(wrapper.vm.selecting).toBe(false);
      });
    });
  });
});
