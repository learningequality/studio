import { computed, onUnmounted, ref, unref } from 'vue';
import { Channel } from 'shared/data/resources';
import { usePublishedData } from './usePublishedData';

const POLLING_INTERVAL_MS = 2000; 
const MAX_POLLING_DURATION_MS = 5 * 60 * 1000; 

export function useLicenseAudit(channelId, channelVersion) {
  const {
    isLoading: publishedDataIsLoading,
    isFinished: publishedDataIsFinished,
    data: publishedData,
    fetchData: fetchPublishedData,
  } = usePublishedData(channelId);

  const isAuditing = ref(false);
  const auditTaskId = ref(null);
  const pollingInterval = ref(null);
  const pollingStartTime = ref(null);
  const auditError = ref(null);

  const currentVersionData = computed(() => {
    const version = unref(channelVersion);
    if (!publishedData.value || version == null) {
      return undefined;
    }
    const versionStr = String(version);
    return publishedData.value[versionStr] || publishedData.value[Number(versionStr)];
  });

  const hasAuditData = computed(() => {
    const versionData = currentVersionData.value;
    if (!versionData) {
      return false;
    }

    return (
      'community_library_invalid_licenses' in versionData &&
      'community_library_special_permissions' in versionData
    );
  });

  const invalidLicenses = computed(() => {
    const versionData = currentVersionData.value;
    if (!versionData) return undefined;
    return versionData.community_library_invalid_licenses;
  });

  const specialPermissions = computed(() => {
    const versionData = currentVersionData.value;
    if (!versionData) return undefined;
    return versionData.community_library_special_permissions;
  });

  const includedLicenses = computed(() => {
    const versionData = currentVersionData.value;
    if (!versionData) return undefined;
    return versionData.included_licenses;
  });

  const isAuditInProgress = computed(() => {
    if (isAuditComplete.value) return false;
    return isAuditing.value || pollingInterval.value !== null;
  });

  const isAuditComplete = computed(() => {
    return publishedDataIsFinished.value && hasAuditData.value;
  });

  function stopPolling() {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value);
      pollingInterval.value = null;
    }
    pollingStartTime.value = null;
  }

  function startPolling() {
    if (pollingInterval.value) return;

    pollingStartTime.value = Date.now();

    pollingInterval.value = setInterval(async () => {
      if (Date.now() - pollingStartTime.value > MAX_POLLING_DURATION_MS) {
        stopPolling();
        auditError.value = new Error('Audit timeout: Maximum polling duration exceeded');
        isAuditing.value = false;
        return;
      }

      try {
        await fetchPublishedData();

        if (hasAuditData.value) {
          stopPolling();
          isAuditing.value = false;
          auditError.value = null;
        }
      } catch (error) {
        stopPolling();
        isAuditing.value = false;
        auditError.value = error;
      }
    }, POLLING_INTERVAL_MS);
  }

  async function triggerAudit() {
    if (isAuditing.value) return;

    try {
      isAuditing.value = true;
      auditError.value = null;

      const response = await Channel.auditLicenses(channelId);
      auditTaskId.value = response.task_id;

      startPolling();
    } catch (error) {
      isAuditing.value = false;
      auditError.value = error;
      throw error;
    }
  }

  async function checkAndTriggerAudit() {
    if (!publishedDataIsFinished.value) {
      await fetchPublishedData();
    }

    if (hasAuditData.value || isAuditing.value) {
      return;
    }

    await triggerAudit();
  }

  onUnmounted(() => {
    stopPolling();
  });

  return {
    isLoading: computed(() => {
      if (isAuditComplete.value || auditError.value) return false;
      return publishedDataIsLoading.value || isAuditInProgress.value;
    }),
    isFinished: computed(() => isAuditComplete.value),
    isAuditing: isAuditInProgress,
    invalidLicenses,
    specialPermissions,
    includedLicenses,
    hasAuditData,
    auditTaskId,
    error: auditError,

    checkAndTriggerAudit,
    triggerAudit,
    fetchPublishedData,
  };
}

