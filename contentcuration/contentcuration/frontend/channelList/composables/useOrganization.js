import { ref, onMounted } from 'vue';
import { OrganizationRoles } from '../constants';
import { Organization } from 'shared/data/resources';

/**
 * Composable for fetching, creating, and updating a single organization.
 * Pass a getter returning a falsy organizationId to use this in "create a new
 * organization" mode: the fetch is skipped and `create` becomes usable instead
 * of `update`.
 */
export function useOrganization(getOrganizationId) {
  const loading = ref(Boolean(getOrganizationId()));
  const organization = ref(null);

  function load() {
    return Organization.fetchModel(getOrganizationId()).then(data => {
      organization.value = data;
    });
  }

  onMounted(() => {
    if (!getOrganizationId()) {
      return;
    }
    load().finally(() => {
      loading.value = false;
    });
  });

  function update(data) {
    return Organization.update(getOrganizationId(), data).then(updated => {
      organization.value = updated;
      return updated;
    });
  }

  function create(data) {
    return Organization.create(data).then(created => {
      const withAdminRole = { ...created, role: OrganizationRoles.ADMIN };
      organization.value = withAdminRole;
      return withAdminRole;
    });
  }

  return {
    loading,
    organization,
    update,
    create,
  };
}
