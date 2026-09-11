import { ref, onMounted } from 'vue';
import { Invitation } from 'shared/data/resources';

/**
 * Composable for fetching and responding to organization invitations.
 *
 * @param {Object} params - fetchCollection params, e.g. `{ invited: 1 }` for
 *   "invitations addressed to me" (used by the My Organizations banner), or
 *   `{ organization: organizationId }` for "pending invites for this org"
 *   (used by the org Sharing tab).
 */
export function useOrganizationInvitations(params = { invited: 1 }) {
  const loading = ref(true);
  const invitations = ref([]);

  function loadInvitations() {
    return Invitation.fetchCollection(params).then(data => {
      invitations.value = data.filter(
        invitation =>
          invitation.organization &&
          !invitation.accepted &&
          !invitation.declined &&
          !invitation.revoked,
      );
    });
  }

  onMounted(() => {
    loadInvitations().finally(() => {
      loading.value = false;
    });
  });

  function accept(invitationId) {
    return Invitation.accept(invitationId).then(() => {
      invitations.value = invitations.value.filter(i => i.id !== invitationId);
    });
  }

  function decline(invitationId) {
    return Invitation.decline(invitationId).then(() => {
      invitations.value = invitations.value.filter(i => i.id !== invitationId);
    });
  }

  function revoke(invitationId) {
    return Invitation.revoke(invitationId).then(() => {
      invitations.value = invitations.value.filter(i => i.id !== invitationId);
    });
  }

  return {
    loading,
    invitations,
    accept,
    decline,
    revoke,
    refresh: loadInvitations,
  };
}
