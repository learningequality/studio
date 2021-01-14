import { mount } from '@vue/test-utils';
import router from '../../../router';
import { factory } from '../../../store';
import { RouterNames } from '../../../constants';
import ChannelTable from '../ChannelTable';

const store = factory();

const loadChannels = jest.fn().mockReturnValue(Promise.resolve());
const channelList = ['test', 'channel', 'table'];
function makeWrapper() {
  router.replace({ name: RouterNames.CHANNELS });
  return mount(ChannelTable, {
    router,
    store,
    sync: false,
    computed: {
      count() {
        return 10;
      },
      channels() {
        return channelList;
      },
    },
    methods: {
      loadChannels,
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
    it('removing selectAll should set selected to empty list', () => {
      wrapper.vm.selected = channelList;
      wrapper.vm.selectAll = false;
      wrapper.vm.$nextTick(() => {
        expect(wrapper.vm.selected).toEqual([]);
      });
    });
    it('selectedCount should match the selected length', () => {
      wrapper.vm.selected = ['test'];
      expect(wrapper.vm.selectedCount).toBe(1);
    });
    it('selected should clear on query changes', () => {
      wrapper.vm.selected = ['test'];
      router.push({
        ...wrapper.vm.$route,
        query: {
          param: 'test',
        },
      });
      wrapper.vm.$nextTick(() => {
        expect(wrapper.vm.selected).toEqual([]);
      });
    });
  });
  describe('bulk actions', () => {
    it('should be hidden if no items are selected', () => {
      expect(wrapper.find('[data-test="csv"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="pdf"]').exists()).toBe(false);
    });
    it('should be visible if items are selected', () => {
      wrapper.vm.selected = channelList;
      wrapper.vm.$nextTick(() => {
        expect(wrapper.find('[data-test="csv"]').exists()).toBe(true);
        expect(wrapper.find('[data-test="pdf"]').exists()).toBe(true);
      });
    });
    it('download PDF should call downloadPDF', () => {
      const downloadPDF = jest.fn();
      wrapper.setMethods({ downloadPDF });
      wrapper.vm.selected = channelList;
      wrapper.vm.$nextTick(() => {
        wrapper.find('[data-test="pdf"] .v-btn').trigger('click');
        expect(downloadPDF).toHaveBeenCalled();
      });
    });
    it('download CSV should call downloadCSV', () => {
      const downloadCSV = jest.fn();
      wrapper.setMethods({ downloadCSV });
      wrapper.vm.selected = channelList;
      wrapper.vm.$nextTick(() => {
        wrapper.find('[data-test="csv"] .v-btn').trigger('click');
        expect(downloadCSV).toHaveBeenCalled();
      });
    });
  });
});
