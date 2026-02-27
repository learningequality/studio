import { ref } from 'vue';
import { ChannelVersion } from 'shared/data/resources';

export const VERSIONS_PER_PAGE = 10;

/**
 * Composable that fetches and manages paginated channel versions
 *
 * @returns {{
 *   versions: import('vue').Ref<Array<Object>>,
 *   isLoading: import('vue').Ref<boolean>,
 *   isLoadingMore: import('vue').Ref<boolean>,
 *   error: import('vue').Ref<Error|null>,
 *   hasMore: import('vue').Ref<boolean>,
 *   currentPage: import('vue').Ref<number>,
 *   fetchVersions: (channelId: string) => Promise<void>,
 *   fetchMore: () => Promise<void>,
 * }}
 */
export function useChannelVersionHistory() {
  const versions = ref([]);
  const isLoading = ref(false);
  const isLoadingMore = ref(false);
  const error = ref(null);
  const hasMore = ref(false);
  const currentPage = ref(0);
  const currentChannelId = ref(null);

  /**
   * Fetch first page of versions for a channel
   * @param {string} channelId - The channel ID to fetch versions for
   */
  async function fetchVersions(channelId) {
    isLoading.value = true;
    error.value = null;
    versions.value = [];
    currentPage.value = 0;
    currentChannelId.value = channelId;

    try {
      const response = await ChannelVersion.fetchCollection({
        channel: channelId,
        page_size: VERSIONS_PER_PAGE,
        page: 1,
      });

      versions.value = response.results || [];
      currentPage.value = 1;

      // Check if there are more pages
      // response.next will be null if no more pages
      hasMore.value = response.next !== null;
    } catch (err) {
      error.value = err;
      versions.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchMore() {
    if (!hasMore.value || isLoadingMore.value || !currentChannelId.value) {
      return;
    }

    isLoadingMore.value = true;
    error.value = null;

    try {
      const nextPage = currentPage.value + 1;
      const response = await ChannelVersion.fetchCollection({
        channel: currentChannelId.value,
        page_size: VERSIONS_PER_PAGE,
        page: nextPage,
      });

      versions.value = [...versions.value, ...(response.results || [])];
      currentPage.value = nextPage;

      hasMore.value = response.next !== null;
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
    hasMore.value = false;
    currentPage.value = 0;
    currentChannelId.value = null;
  }

  return {
    versions,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    currentPage,
    fetchVersions,
    fetchMore,
    reset,
  };
}
