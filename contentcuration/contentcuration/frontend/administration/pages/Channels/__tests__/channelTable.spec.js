import { mount } from '@vue/test-utils';
import router from '../../../router';
import { factory } from '../../../store';
import { RouteNames } from '../../../constants';
import ChannelTable from '../ChannelTable';

const store = factory();

const channelList = ['test', 'channel', 'table'];
let loadItems;

function makeWrapper() {
  loadItems = jest.spyOn(ChannelTable.mixins[0].methods, '_loadItems');
  loadItems.mockImplementation(() => Promise.resolve());

  router.replace({ name: RouteNames.CHANNELS });

  return mount(ChannelTable, {
    router,
    store,
    attachTo: document.body,
    computed: {
      count() {
        return 10;
      },
      channels() {
        return channelList;
      },
    },
    stubs: {
      ChannelItem: true,
    },
  });
}

describe('channelTable', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = makeWrapper();
  });
  afterEach(() => {
    loadItems.mockRestore();
  });
  describe('filters', () => {
    it('changing filter should set query params', () => {
      wrapper.vm.filter = 'public';
      expect(Boolean(router.currentRoute.query.public)).toBe(true);
    });
    it('changing language should set query params', () => {
      wrapper.vm.language = 'en';
      expect(router.currentRoute.query.languages).toBe('en');
    });
    it('changing search text should set query params', () => {
      wrapper.vm.keywords = 'keyword test';
      expect(router.currentRoute.query.keywords).toBe('keyword test');
    });
  });
  describe('selection', () => {
    it('selectAll should set selected to channel list', () => {
      wrapper.vm.selectAll = true;
      expect(wrapper.vm.selected).toEqual(channelList);
    });
    it('removing selectAll should set selected to empty list', async () => {
      wrapper.vm.selected = channelList;
      wrapper.vm.selectAll = false;
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.selected).toEqual([]);
    });
    it('selectedCount should match the selected length', () => {
      wrapper.vm.selected = ['test'];
      expect(wrapper.vm.selectedCount).toBe(1);
    });
    it('selected should clear on query changes', async () => {
      wrapper.vm.selected = ['test'];
      router.push({
        ...wrapper.vm.$route,
        query: {
          param: 'test',
        },
      });
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.selected).toEqual([]);
    });
  });
  describe('bulk actions', () => {
    it('should be hidden if no items are selected', () => {
      expect(wrapper.find('[data-test="csv"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="pdf"]').exists()).toBe(false);
    });
    it('should be visible if items are selected', async () => {
      wrapper.vm.selected = channelList;
      await wrapper.vm.$nextTick();
      expect(wrapper.find('[data-test="csv"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="pdf"]').exists()).toBe(true);
    });
    it('download PDF should call downloadPDF', async () => {
      const downloadPDF = jest.spyOn(wrapper.vm, 'downloadPDF');
      downloadPDF.mockImplementation(() => Promise.resolve());
      wrapper.vm.selected = channelList;
      await wrapper.vm.$nextTick();
      wrapper.findComponent('[data-test="pdf"]').trigger('click');
      expect(downloadPDF).toHaveBeenCalled();
    });
    it('download CSV should call downloadCSV', async () => {
      const downloadCSV = jest.spyOn(wrapper.vm, 'downloadCSV');
      downloadCSV.mockImplementation(() => Promise.resolve());
      wrapper.vm.selected = channelList;
      await wrapper.vm.$nextTick();
      wrapper.findComponent('[data-test="csv"]').trigger('click');
      expect(downloadCSV).toHaveBeenCalled();
    });
  });
});
