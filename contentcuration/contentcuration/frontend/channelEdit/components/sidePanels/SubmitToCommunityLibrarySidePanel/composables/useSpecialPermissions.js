import { computed, ref, unref, watchEffect } from 'vue';
import { AuditedSpecialPermissionsLicense } from 'shared/data/resources';

const ITEMS_PER_PAGE = 5;

export function useSpecialPermissions(permissionIds) {
  const permissions = ref([]);
  const isLoading = ref(false);
  const error = ref(null);
  const currentPage = ref(1);

  const nonDistributablePermissions = computed(() => {
    return permissions.value.filter(p => !p.distributable);
  });

  const totalPages = computed(() => {
    return Math.ceil(nonDistributablePermissions.value.length / ITEMS_PER_PAGE);
  });

  const currentPagePermissions = computed(() => {
    const start = (currentPage.value - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return nonDistributablePermissions.value.slice(start, end);
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

      const flattenedPermissions = [];
      response.forEach(permission => {
        const sentences = permission.description
          .split('.')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        sentences.forEach((sentence, index) => {
          let text = sentence;
          if (!text.endsWith('.')) {
            text += '.';
          }

          flattenedPermissions.push({
            id: `${permission.id}-${index}`,
            originalId: permission.id,
            description: text,
            distributable: permission.distributable,
          });
        });
      });
      permissions.value = flattenedPermissions;
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
    return Array.isArray(ids) ? ids : [ids];
  });

  watchEffect(() => {
    const ids = resolvedPermissionIds.value;

    if (ids.length === 0) {
      permissions.value = [];
      return;
    }
    fetchPermissions(ids);
  });

  return {
    permissions: nonDistributablePermissions,
    currentPagePermissions,
    isLoading,
    error,
    currentPage,
    totalPages,
    nextPage,
    previousPage,
  };
}
