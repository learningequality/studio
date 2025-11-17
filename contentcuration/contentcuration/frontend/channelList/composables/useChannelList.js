import { ref, computed, onMounted, getCurrentInstance } from 'vue';
import { useRouter, useRoute } from 'vue-router/composables';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import orderBy from 'lodash/orderBy';
import { RouteNames } from '../constants';

/**
 * Composable for channel list functionality
 *
 * @param {Object} options - Configuration options
 * @param {string} options.listType - Type of channel list (from ChannelListTypes)
 * @param {Array<string>} options.sortFields - Fields to sort by (default: ['modified'])
 * @param {Array<string>} options.orderFields - Sort order (default: ['desc'])
 * @param {Function} options.filterFn - Additional filter function for channels
 * @returns {Object} Channel list state and methods
 */
export function useChannelList(options = {}) {
  const { listType, sortFields = ['modified'], orderFields = ['desc'], filterFn = null } = options;

  const instance = getCurrentInstance();
  const store = instance.proxy.$store;

  const router = useRouter();
  const route = useRoute();

  const { windowIsMedium, windowIsLarge, windowBreakpoint } = useKResponsiveWindow();

  const loading = ref(false);

  const channels = computed(() => store.getters['channel/channels'] || []);

  const listChannels = computed(() => {
    if (!channels.value || channels.value.length === 0) {
      return [];
    }

    let filtered = channels.value.filter(channel => channel[listType] && !channel.deleted);

    if (filterFn && typeof filterFn === 'function') {
      filtered = filtered.filter(filterFn);
    }

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

  // Methods
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

  const newChannel = () => {
    if (window.$analytics) {
      window.$analytics.trackClick('channel_list', 'Create channel');
    }

    router.push({
      name: RouteNames.NEW_CHANNEL,
      query: { last: route.name },
    });
  };

  const goToChannel = channelId => {
    window.location.href = window.Urls.channel(channelId);
  };

  const channelDetailsLink = channel => {
    return {
      name: RouteNames.CHANNEL_DETAILS,
      query: {
        ...route.query,
        last: route.name,
      },
      params: {
        channelId: channel.id,
      },
    };
  };

  const channelEditLink = channel => {
    return {
      name: RouteNames.CHANNEL_EDIT,
      query: {
        ...route.query,
        last: route.name,
      },
      params: {
        channelId: channel.id,
        tab: 'edit',
      },
    };
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
    newChannel,
    goToChannel,
    channelDetailsLink,
    channelEditLink,
  };
}
