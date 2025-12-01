import { ref, computed, onMounted, getCurrentInstance } from 'vue';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import orderBy from 'lodash/orderBy';

/**
 * Composable for channel list functionality
 *
 * @param {Object} options - Configuration options
 * @param {string} options.listType - Type of channel list (from ChannelListTypes)
 * @param {Array<string>} options.sortFields - Fields to sort by (default: ['modified'])
 * @param {Array<string>} options.orderFields - Sort order (default: ['desc'])
 * @returns {Object} Channel list state and methods
 */
export function useChannelList(options = {}) {
  const { listType, sortFields = ['modified'], orderFields = ['desc'] } = options;

  const instance = getCurrentInstance();
  const store = instance.proxy.$store;

  const { windowIsMedium, windowIsLarge, windowBreakpoint } = useKResponsiveWindow();

  const loading = ref(false);

  const channels = computed(() => store.getters['channel/channels'] || []);

  const listChannels = computed(() => {
    if (!channels.value || channels.value.length === 0) {
      return [];
    }

    const filtered = channels.value.filter(channel => channel[listType] && !channel.deleted);

    return orderBy(filtered, sortFields, orderFields);
  });

  const hasChannels = computed(() => listChannels.value.length > 0);

  const maxWidthStyle = computed(() => {
    if (windowBreakpoint.value >= 5) return '50%';
    if (windowBreakpoint.value === 4) return '66.66%';
    if (windowBreakpoint.value === 3) return '83.33%';

    if (windowIsLarge.value) return '50%';
    if (windowIsMedium.value) return '83.33%';

    return '100%';
  });

  const loadData = async () => {
    loading.value = true;
    try {
      await store.dispatch('channel/loadChannelList', { listType });
    } catch (error) {
      loading.value = false;
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    loadData();
  });

  return {
    loading,
    channels,
    listChannels,
    hasChannels,

    maxWidthStyle,

    loadData,
  };
}
