import { onMounted, ref } from 'vue';
import { Organization } from 'shared/data/resources';

const PAGE_SIZE = 100;

function results(data) {
  return Array.isArray(data) ? data : data?.results || [];
}

export function useOrganizationList() {
  const loading = ref(true);
  const error = ref(false);
  const organizations = ref([]);

  async function load() {
    loading.value = true;
    error.value = false;
    try {
      organizations.value = results(
        await Organization.fetchCollection({ page_size: PAGE_SIZE, ordering: 'name' }),
      );
    } catch (e) {
      error.value = true;
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);
  return { organizations, loading, error, load };
}

export function useOrganization(organizationId) {
  const loading = ref(Boolean(organizationId));
  const error = ref(false);
  const organization = ref(null);

  async function load() {
    if (!organizationId) return;
    loading.value = true;
    error.value = false;
    try {
      organization.value = await Organization.fetchModel(organizationId);
    } catch (e) {
      error.value = true;
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);
  return { organization, loading, error, load };
}
