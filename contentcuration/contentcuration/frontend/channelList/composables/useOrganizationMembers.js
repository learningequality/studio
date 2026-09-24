import { ref, onMounted } from 'vue';
import { OrganizationRoleStatuses } from '../constants';
import { OrganizationRole } from 'shared/data/resources';

const MAX_PAGE_SIZE = 100;

/**
 * Composable for fetching and managing an organization's active members.
 */
export function useOrganizationMembers(organizationId) {
  const loading = ref(true);
  const members = ref([]);

  function loadMembers() {
    return OrganizationRole.fetchCollection({
      organization: organizationId,
      status: OrganizationRoleStatuses.ACTIVE,
      page_size: MAX_PAGE_SIZE,
    }).then(data => {
      members.value = data;
    });
  }

  onMounted(() => {
    loadMembers().finally(() => {
      loading.value = false;
    });
  });

  function changeRole(roleId, role) {
    return OrganizationRole.update(roleId, { role }).then(updated => {
      members.value = members.value.map(member => (member.id === roleId ? updated : member));
      return updated;
    });
  }

  function close(roleId) {
    return OrganizationRole.delete(roleId).then(() => {
      members.value = members.value.filter(member => member.id !== roleId);
    });
  }

  return {
    loading,
    members,
    changeRole,
    close,
    refresh: loadMembers,
  };
}
