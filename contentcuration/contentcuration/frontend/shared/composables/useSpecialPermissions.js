import { computed, ref, unref, watch } from 'vue';
import { AuditedSpecialPermissionsLicense } from 'shared/data/resources';

const ITEMS_PER_PAGE = 3;

/**
 * Composable that fetches and paginates audited special-permissions licenses
 * for a given channel version ID.
 *
 * @param {string|number|import('vue').Ref<string|number>|null} channelVersionId
 *   The ChannelVersion ID to fetch special permissions for via ManyToMany relationship.
 *
 * @returns {{
 *   permissions: import('vue').Ref<Array<Object>>,
 *   currentPagePermissions: import('vue').ComputedRef<Array<Object>>,
 *   isLoading: import('vue').Ref<boolean>,
 *   error: import('vue').Ref<Error|null>,
 *   currentPage: import('vue').Ref<number>,
 *   totalPages: import('vue').ComputedRef<number>,
 *   nextPage: () => void,
 *   previousPage: () => void,
 * }}
 *   Reactive state for the fetched, flattened permissions and pagination
 *   helpers used by `SpecialPermissionsList.vue`.
 */
export function useSpecialPermissions(channelVersionId, { distributable }) {
  const permissions = ref([]);
  const isLoading = ref(false);
  const error = ref(null);
  const currentPage = ref(1);

  const totalPages = computed(() => {
    return Math.ceil(permissions.value.length / ITEMS_PER_PAGE);
  });

  const currentPagePermissions = computed(() => {
    const start = (currentPage.value - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return permissions.value.slice(start, end);
  });

  async function fetchPermissions(versionId) {
    isLoading.value = true;
    error.value = null;
    permissions.value = [];

    try {
      if (versionId) {
        const filters = {
          channel_version: versionId,
        };
        if (distributable !== null) {
          filters.distributable = distributable;
        }
        const response = await AuditedSpecialPermissionsLicense.fetchCollection(filters);

        permissions.value = response;
      }
    } catch (err) {
      error.value = err;
      permissions.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  function nextPage() {
    if (currentPage.value < totalPages.value) {
      currentPage.value += 1;
    }
  }

  function previousPage() {
    if (currentPage.value > 1) {
      currentPage.value -= 1;
    }
  }

  watch(
    () => unref(channelVersionId),
    versionId => {
      fetchPermissions(versionId);
    },
    { immediate: true },
  );

  return {
    permissions,
    currentPagePermissions,
    isLoading,
    error,
    currentPage,
    totalPages,
    nextPage,
    previousPage,
  };
}
