import { ref, onMounted } from 'vue';
import { Organization } from 'shared/data/resources';

const MAX_PAGE_SIZE = 100;

/**
 * Composable for fetching the organizations the current user belongs to.
 */
export function useOrganizationList() {
  const loading = ref(true);
  const organizations = ref([]);

  onMounted(() => {
    Organization.fetchCollection({ page_size: MAX_PAGE_SIZE })
      .then(data => {
        organizations.value = data;
      })
      .finally(() => {
        loading.value = false;
      });
  });

  return {
    loading,
    organizations,
  };
}
