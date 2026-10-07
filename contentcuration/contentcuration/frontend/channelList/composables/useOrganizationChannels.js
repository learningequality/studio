import { ref, onMounted } from 'vue';
import { Organization } from 'shared/data/resources';

/**
 * Composable for fetching an organization's channels with their sizes.
 */
export function useOrganizationChannels(organizationId) {
  const loading = ref(true);
  const channels = ref([]);
  const size = ref(0);
  const error = ref(false);

  onMounted(() => {
    Organization.fetchChannels(organizationId)
      .then(data => {
        channels.value = data.channels;
        size.value = data.size;
      })
      .catch(() => {
        error.value = true;
      })
      .finally(() => {
        loading.value = false;
      });
  });

  return {
    loading,
    channels,
    size,
    error,
  };
}
