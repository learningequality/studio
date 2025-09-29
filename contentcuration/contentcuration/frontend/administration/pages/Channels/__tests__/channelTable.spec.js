import { mount, createLocalVue } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import router from '../../../router';
import { RouteNames } from '../../../constants';
import ChannelTable from '../ChannelTable';

const localVue = createLocalVue();

localVue.use(Vuex);
localVue.use(router);

const channelList = ['test', 'channel', 'table'];

function makeWrapper(store) {
  router.replace({ name: RouteNames.CHANNELS });

  return mount(ChannelTable, {
    router,
    store,
    localVue,
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
  let store;
  const loadChannels = jest.fn(() => Promise.resolve({}));

  beforeEach(() => {
    store = new Store({
      modules: {
        channelAdmin: {
          namespaced: true,
          actions: {
            loadChannels,
          },
        },
      },
    });
    wrapper = makeWrapper(store);
  });
  afterEach(() => {
    loadChannels.mockRestore();
  });
  describe('filters', () => {
    it('changing channel type filter should set query params', async () => {
      wrapper.vm.channelTypeFilter = 'community';
      expect(router.currentRoute.query.channelType).toBe('community');
    });
    it('changing language filter should set query params', () => {
      wrapper.vm.languageFilter = 'en';
      expect(router.currentRoute.query.language).toBe('en');
    });
    it('changing search text should set query params', () => {
      jest.useFakeTimers();
      wrapper.vm.keywordInput = 'keyword test';
      wrapper.vm.setKeywords();
      jest.runAllTimers();
      jest.useRealTimers();

      expect(router.currentRoute.query.keywords).toBe('keyword test');
    });
    it('changing channel type filter should reset channel status filter', async () => {
      wrapper.vm.channelTypeFilter = 'community';
      wrapper.vm.channelStatusFilter = 'published';
      await wrapper.vm.$nextTick();
      wrapper.vm.channelTypeFilter = 'unlisted';
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.channelStatusFilter).toBe('live');
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
