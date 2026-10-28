import { ref, onMounted } from 'vue';
import { Organization } from 'shared/data/resources';

const MAX_PAGE_SIZE = 100;

/**
 * Fetch organizations visible to the user, including public organizations.
 */
export function useOrganizationList() {
  const loading = ref(true);
  const organizations = ref([]);

  function loadOrganizations() {
    return Organization.fetchCollection({ page_size: MAX_PAGE_SIZE }).then(data => {
      organizations.value = data;
    });
  }

  onMounted(() => {
    loadOrganizations().finally(() => {
      loading.value = false;
    });
  });

  return {
    loading,
    organizations,
    refresh: loadOrganizations,
  };
}
