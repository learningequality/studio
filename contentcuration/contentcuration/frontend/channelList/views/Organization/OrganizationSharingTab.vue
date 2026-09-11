<template>

  <div class="organization-sharing-tab">
    <template v-if="isAdmin">
      <InviteOrganizationUserForm
        :organizationId="organizationId"
        :sendInvitation="sendOrganizationInvitation"
      />

      <OrganizationUsersTable
        class="users-table"
        :members="members"
        :invitations="invitations"
        :loading="membersLoading || invitationsLoading"
        :changeRole="changeRole"
        :closeMemberRole="closeMemberRole"
        :resendInvitation="resendInvitation"
        :revokeInvitation="revokeInvitation"
      />
    </template>

    <p
      v-else
      class="not-admin"
    >
      {{ $tr('notAdmin') }}
    </p>
  </div>

</template>


<script>

  import { useOrganizationMembers } from '../../composables/useOrganizationMembers';
  import { useOrganizationInvitations } from '../../composables/useOrganizationInvitations';
  import InviteOrganizationUserForm from './InviteOrganizationUserForm.vue';
  import OrganizationUsersTable from './OrganizationUsersTable.vue';
  import { Invitation } from 'shared/data/resources';

  export default {
    name: 'OrganizationSharingTab',
    components: {
      InviteOrganizationUserForm,
      OrganizationUsersTable,
    },
    setup(props) {
      const {
        loading: membersLoading,
        members,
        changeRole,
        close: closeMemberRole,
      } = useOrganizationMembers(props.organizationId);
      const {
        loading: invitationsLoading,
        invitations,
        revoke: revokeInvitation,
        refresh: refreshInvitations,
      } = useOrganizationInvitations({ organization: props.organizationId });

      function sendOrganizationInvitation({ organizationId, email, shareMode }) {
        return Invitation.sendOrganizationInvitation({ organizationId, email, shareMode }).then(
          () => refreshInvitations(),
        );
      }

      function resendInvitation(invitationId) {
        const invitation = invitations.value.find(i => i.id === invitationId);
        return sendOrganizationInvitation({
          organizationId: props.organizationId,
          email: invitation.email,
          shareMode: invitation.share_mode,
        });
      }

      return {
        membersLoading,
        members,
        changeRole,
        closeMemberRole,
        invitationsLoading,
        invitations,
        revokeInvitation,
        sendOrganizationInvitation,
        resendInvitation,
      };
    },
    props: {
      organizationId: {
        type: String,
        required: true,
      },
      isAdmin: {
        type: Boolean,
        default: false,
      },
    },
    $trs: {
      notAdmin: 'Only organization admins can manage sharing settings.',
    },
  };

</script>


<style lang="scss" scoped>

  .users-table {
    margin-top: 32px;
  }

  .not-admin {
    max-width: 600px;
    margin: 48px auto;
    font-size: 16px;
    text-align: center;
  }

</style>
