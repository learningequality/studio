import { ref, computed } from 'vue';
import { ChannelVersion } from 'shared/data/resources';

export const VERSIONS_PER_PAGE = 5;

/**
 * Composable that fetches and manages cursor-based paginated channel versions
 *
 * @returns {{
 *   versions: import('vue').Ref<Array<Object>>,
 *   isLoading: import('vue').Ref<boolean>,
 *   isLoadingMore: import('vue').Ref<boolean>,
 *   error: import('vue').Ref<Error|null>,
 *   hasMore: import('vue').ComputedRef<boolean>,
 *   fetchVersions: (channelId: string) => Promise<void>,
 *   fetchMore: () => Promise<void>,
 *   reset: () => void,
 * }}
 */
export function useChannelVersionHistory() {
  const versions = ref([]);
  const isLoading = ref(false);
  const isLoadingMore = ref(false);
  const error = ref(null);
  const moreObject = ref(null);
  const currentChannelId = ref(null);

  const hasMore = computed(() => Boolean(moreObject.value));

  /**
   * Fetch first page of versions for a channel
   * @param {string} channelId - The channel ID to fetch versions for
   */
  async function fetchVersions(channelId) {
    isLoading.value = true;
    error.value = null;
    versions.value = [];
    moreObject.value = null;
    currentChannelId.value = channelId;

    try {
      const response = await ChannelVersion.fetchCollection({
        channel: channelId,
        max_results: VERSIONS_PER_PAGE,
        version__gte: 0, // Exclude unpublished versions with version=null
      });

      versions.value = response.results || [];
      moreObject.value = response.more || null;
    } catch (err) {
      error.value = err;
      versions.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchMore() {
    if (!hasMore.value || isLoadingMore.value) {
      return;
    }

    isLoadingMore.value = true;
    error.value = null;

    try {
      const response = await ChannelVersion.fetchCollection(moreObject.value);

      versions.value = [...versions.value, ...(response.results || [])];
      moreObject.value = response.more || null;
    } catch (err) {
      error.value = err;
    } finally {
      isLoadingMore.value = false;
    }
  }

  function reset() {
    versions.value = [];
    isLoading.value = false;
    isLoadingMore.value = false;
    error.value = null;
    moreObject.value = null;
    currentChannelId.value = null;
  }

  return {
    versions,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    fetchVersions,
    fetchMore,
    reset,
  };
}
