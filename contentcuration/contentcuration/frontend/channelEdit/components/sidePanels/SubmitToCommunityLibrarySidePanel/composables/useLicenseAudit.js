import { computed, ref, unref, watch } from 'vue';
import { Channel } from 'shared/data/resources';

export function useLicenseAudit(channelRef, channelVersionRef) {
  const isAuditing = ref(false);
  const auditTaskId = ref(null);
  const auditError = ref(null);
  const publishedData = ref(null);

  watch(
    () => unref(channelRef)?.published_data,
    newPublishedData => {
      if (newPublishedData) {
        publishedData.value = newPublishedData;
        if (isAuditing.value) {
          isAuditing.value = false;
          auditError.value = null;
        }
      }
    },
    { immediate: true, deep: true },
  );

  const currentVersionData = computed(() => {
    const version = unref(channelVersionRef);
    if (!publishedData.value || version == null) {
      return undefined;
    }
    return publishedData.value[version];
  });

  const hasAuditData = computed(() => {
    const versionData = currentVersionData.value;
    if (!versionData) {
      return false;
    }

    return (
      'non_distributable_licenses_included' in versionData &&
      'special_permissions_included' in versionData
    );
  });

  const invalidLicenses = computed(() => {
    const versionData = currentVersionData.value;
    return versionData?.non_distributable_licenses_included || [];
  });

  const specialPermissions = computed(() => {
    const versionData = currentVersionData.value;
    return versionData?.special_permissions_included || [];
  });

  const includedLicenses = computed(() => {
    const versionData = currentVersionData.value;
    return versionData?.included_licenses || [];
  });

  const isAuditComplete = computed(() => {
    return publishedData.value !== null && hasAuditData.value;
  });

  async function triggerAudit() {
    if (isAuditing.value) return;

    try {
      isAuditing.value = true;
      auditError.value = null;

      const channelId = unref(channelRef)?.id;
      if (!channelId) {
        throw new Error('Channel ID is required to trigger audit');
      }

      const response = await Channel.auditLicenses(channelId);
      auditTaskId.value = response.task_id;
    } catch (error) {
      isAuditing.value = false;
      auditError.value = error;
      throw error;
    }
  }

  async function fetchPublishedData() {
    const channelId = unref(channelRef)?.id;
    if (!channelId) return;

    try {
      const data = await Channel.getPublishedData(channelId);
      publishedData.value = data;
    } catch (error) {
      auditError.value = error;
      throw error;
    }
  }

  async function checkAndTriggerAudit() {
    if (!publishedData.value) {
      await fetchPublishedData();
    }

    if (hasAuditData.value || isAuditing.value) {
      return;
    }

    await triggerAudit();
  }

  return {
    isLoading: computed(() => {
      if (isAuditComplete.value || auditError.value) return false;
      return isAuditing.value;
    }),
    isFinished: computed(() => isAuditComplete.value),
    isAuditing,
    invalidLicenses,
    specialPermissions,
    includedLicenses,
    hasAuditData,
    auditTaskId,
    error: auditError,

    checkAndTriggerAudit,
    triggerAudit,
    fetchPublishedData,
    currentVersionData,
  };
}
