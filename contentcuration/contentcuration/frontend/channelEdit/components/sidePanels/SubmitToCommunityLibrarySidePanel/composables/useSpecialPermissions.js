import { computed, ref, unref, watch } from 'vue';
import { AuditedSpecialPermissionsLicense } from 'shared/data/resources';

const ITEMS_PER_PAGE = 3;

/**
 * Composable that fetches and paginates audited special-permissions licenses
 * for a given set of permission IDs.
 *
 * @param {Array<string|number>|import('vue').Ref<Array<string|number>>} permissionIds
 *   A list (or ref to a list) of special-permissions license IDs to fetch.
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
export function useSpecialPermissions(permissionIds) {
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

  async function fetchPermissions(ids) {
    if (!ids || ids.length === 0) {
      permissions.value = [];
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const response = await AuditedSpecialPermissionsLicense.fetchCollection({
        by_ids: ids.join(','),
        distributable: false,
      });

      permissions.value = response.map(permission => ({
        id: permission.id,
        description: permission.description,
        distributable: permission.distributable,
      }));
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

  const resolvedPermissionIds = computed(() => {
    const ids = unref(permissionIds);
    if (!ids || ids.length === 0) {
      return [];
    }
    return ids;
  });

  watch(
    resolvedPermissionIds,
    ids => {
      fetchPermissions(ids);
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
