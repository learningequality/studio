import { ref, computed, onMounted, getCurrentInstance } from 'vue';
import orderBy from 'lodash/orderBy';

/**
 * Composable for channel list functionality
 *
 * @param {Object} options - Configuration options
 * @param {string} options.listType - Type of channel list (from ChannelListTypes)
 * @param {Array<string>} options.sortFields - Fields to sort by (default: ['modified'])
 * @param {Array<string>} options.orderFields - Sort order (default: ['desc'])
 * @returns {Object} Loading state and filtered & sorted channels
 */
export function useChannelList(options = {}) {
  const { listType, sortFields = ['modified'], orderFields = ['desc'] } = options;

  const instance = getCurrentInstance();
  const store = instance.proxy.$store;

  const loading = ref(false);

  const allChannels = computed(() => store.getters['channel/channels'] || []);

  const channels = computed(() => {
    if (!allChannels.value || allChannels.value.length === 0) {
      return [];
    }

    const filtered = allChannels.value.filter(channel => channel[listType] && !channel.deleted);

    return orderBy(filtered, sortFields, orderFields);
  });

  onMounted(() => {
    loading.value = true;
    store.dispatch('channel/loadChannelList', { listType }).then(() => {
      loading.value = false;
    });
  });

  return {
    loading,
    channels,
  };
}
