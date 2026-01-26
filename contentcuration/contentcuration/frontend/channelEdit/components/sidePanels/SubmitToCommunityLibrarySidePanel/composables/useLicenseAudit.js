import { computed, unref } from 'vue';

export function useLicenseAudit(versionDetailRef, isLoadingRef, isFinishedRef) {
  const hasAuditData = computed(() => {
    const versionData = unref(versionDetailRef);
    if (!versionData) {
      return false;
    }

    return (
      'non_distributable_included_licenses' in versionData &&
      'included_special_permissions' in versionData
    );
  });

  const invalidLicenses = computed(() => {
    const versionData = unref(versionDetailRef);
    return versionData?.non_distributable_included_licenses || [];
  });

  const specialPermissions = computed(() => {
    const versionData = unref(versionDetailRef);
    return versionData?.included_special_permissions || [];
  });

  const includedLicenses = computed(() => {
    const versionData = unref(versionDetailRef);
    return versionData?.included_licenses || [];
  });

  return {
    isLoading: computed(() => {
      const loading = unref(isLoadingRef);
      if (typeof loading === 'boolean') {
        return loading;
      }
      return !unref(versionDetailRef);
    }),
    isFinished: computed(() => {
      const finished = unref(isFinishedRef);
      if (typeof finished === 'boolean') {
        return finished;
      }
      return Boolean(unref(versionDetailRef));
    }),
    invalidLicenses,
    specialPermissions,
    includedLicenses,
    hasAuditData,
  };
}
