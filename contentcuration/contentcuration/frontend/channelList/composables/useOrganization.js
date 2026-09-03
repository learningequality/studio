import { ref, onMounted } from 'vue';
import { OrganizationRoles } from '../constants';
import { Organization } from 'shared/data/resources';

/**
 * Composable for fetching, creating, and updating a single organization.
 * Pass a falsy organizationId to use this in "create a new organization" mode:
 * the fetch is skipped and `create` becomes usable instead of `update`.
 */
export function useOrganization(organizationId) {
  const loading = ref(Boolean(organizationId));
  const organization = ref(null);

  function load() {
    return Organization.fetchModel(organizationId).then(data => {
      organization.value = data;
    });
  }

  onMounted(() => {
    if (!organizationId) {
      return;
    }
    load().finally(() => {
      loading.value = false;
    });
  });

  function update(data) {
    return Organization.update(organizationId, data).then(updated => {
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
