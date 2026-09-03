<template>

  <div class="organization-users-table">
    <h2>{{ $tr('users') }}</h2>

    <div
      v-if="show('loader', loading, 500)"
      class="loader"
    >
      <KCircularLoader />
    </div>

    <KTable
      v-else
      :caption="$tr('users')"
      :headers="headers"
      :rows="rows"
    >
      <template #cell="{ content, colIndex, rowIndex }">
        <span v-if="colIndex < 3">{{ content }}</span>
        <KIconButton
          v-else
          icon="optionsVertical"
          appearance="flat-button"
          :ariaLabel="$tr('optionsFor', { email: rows[rowIndex][1] })"
        >
          <template #menu>
            <KDropdownMenu
              :options="menuOptions(rows[rowIndex][3])"
              @select="option => handleSelect(option, rows[rowIndex][3])"
            />
          </template>
        </KIconButton>
      </template>
    </KTable>

    <KModal
      v-if="closeTarget"
      :title="$tr('closeRoleTitle')"
      :submitText="$tr('closeRoleConfirm')"
      :cancelText="$tr('cancel')"
      @submit="confirmClose"
      @cancel="closeTarget = null"
    >
      {{ $tr('closeRoleText', { email: closeTarget.email }) }}
    </KModal>

    <KModal
      v-if="revokeTarget"
      :title="$tr('revokeInvitationTitle')"
      :submitText="$tr('revokeInvitationConfirm')"
      :cancelText="$tr('cancel')"
      @submit="confirmRevoke"
      @cancel="revokeTarget = null"
    >
      {{ $tr('revokeInvitationText', { email: revokeTarget.email }) }}
    </KModal>
  </div>

</template>


<script>

  import useKShow from 'kolibri-design-system/lib/composables/useKShow';
  import { OrganizationRoles, InvitationShareModes } from '../../constants';
  import useSnackbar from 'shared/composables/useSnackbar';

  const roleLabels = {
    [OrganizationRoles.ADMIN]: 'adminRole',
    [OrganizationRoles.EDITOR]: 'editorRole',
    [OrganizationRoles.VIEWER]: 'viewerRole',
  };

  const shareModeToRole = {
    [InvitationShareModes.ADMIN]: OrganizationRoles.ADMIN,
    [InvitationShareModes.EDIT]: OrganizationRoles.EDITOR,
    [InvitationShareModes.VIEW_ONLY]: OrganizationRoles.VIEWER,
  };

  export default {
    name: 'OrganizationUsersTable',
    setup() {
      const { show } = useKShow();
      const { createSnackbar } = useSnackbar();
      return { show, createSnackbar };
    },
    props: {
      members: {
        type: Array,
        required: true,
      },
      invitations: {
        type: Array,
        required: true,
      },
      loading: {
        type: Boolean,
        default: false,
      },
      changeRole: {
        type: Function,
        required: true,
      },
      closeMemberRole: {
        type: Function,
        required: true,
      },
      resendInvitation: {
        type: Function,
        required: true,
      },
      revokeInvitation: {
        type: Function,
        required: true,
      },
    },
    data() {
      return {
        closeTarget: null,
        revokeTarget: null,
      };
    },
    computed: {
      headers() {
        return [
          { label: this.$tr('name'), dataType: 'string', columnId: 'name' },
          { label: this.$tr('email'), dataType: 'string', columnId: 'email' },
          { label: this.$tr('role'), dataType: 'string', columnId: 'role' },
          { label: this.$tr('options'), dataType: 'undefined', columnId: 'options' },
        ];
      },
      rows() {
        const memberRows = this.members.map(member => [
          member.user_name || member.user_email,
          member.user_email,
          this.$tr(roleLabels[member.role] || member.role),
          { type: 'member', id: member.id, email: member.user_email },
        ]);
        const invitationRows = this.invitations.map(invitation => [
          `${invitation.first_name || ''} ${invitation.last_name || ''}`.trim() || invitation.email,
          invitation.email,
          this.$tr('pendingRole', {
            role: this.$tr(roleLabels[shareModeToRole[invitation.share_mode]] || ''),
          }),
          { type: 'pending', id: invitation.id, email: invitation.email },
        ]);
        return memberRows.concat(invitationRows);
      },
    },
    methods: {
      menuOptions(target) {
        if (target.type === 'pending') {
          return [
            { label: this.$tr('resendInvitation'), value: 'resend' },
            { label: this.$tr('revokeInvitation'), value: 'revoke' },
          ];
        }
        return [
          { label: this.$tr('makeViewer'), value: OrganizationRoles.VIEWER },
          { label: this.$tr('makeEditor'), value: OrganizationRoles.EDITOR },
          { label: this.$tr('makeAdmin'), value: OrganizationRoles.ADMIN },
          { label: this.$tr('closeRole'), value: 'close' },
        ];
      },
      handleSelect(option, target) {
        if (target.type === 'pending') {
          if (option.value === 'resend') {
            this.resendInvitation(target.id).then(() => {
              this.createSnackbar(this.$tr('invitationResent'));
            });
          } else if (option.value === 'revoke') {
            this.revokeTarget = target;
          }
          return;
        }
        if (option.value === 'close') {
          this.closeTarget = target;
        } else {
          this.changeRole(target.id, option.value).catch(error => {
            this.handleMembershipError(error);
          });
        }
      },
      confirmClose() {
        const target = this.closeTarget;
        this.closeTarget = null;
        this.closeMemberRole(target.id)
          .then(() => {
            this.createSnackbar(this.$tr('roleClosed'));
          })
          .catch(error => {
            this.handleMembershipError(error);
          });
      },
      confirmRevoke() {
        const target = this.revokeTarget;
        this.revokeTarget = null;
        this.revokeInvitation(target.id).then(() => {
          this.createSnackbar(this.$tr('invitationRevoked'));
        });
      },
      handleMembershipError(error) {
        const data = error && error.response && error.response.data;
        const message = Array.isArray(data) ? data[0] : null;
        this.createSnackbar(message || this.$tr('genericMembershipError'));
      },
    },
    $trs: {
      users: 'Users',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      options: 'Options',
      optionsFor: 'Options for {email}',
      adminRole: 'Admin',
      editorRole: 'Editor',
      viewerRole: 'Viewer',
      pendingRole: 'Pending {role}',
      resendInvitation: 'Resend invitation',
      revokeInvitation: 'Revoke invitation',
      makeViewer: 'Make viewer',
      makeEditor: 'Make editor',
      makeAdmin: 'Make admin',
      closeRole: 'Remove from organization',
      invitationResent: 'Invitation resent',
      invitationRevoked: 'Invitation revoked',
      roleClosed: 'User removed from organization',
      genericMembershipError: 'Unable to update this member',
      cancel: 'Cancel',
      closeRoleTitle: 'Remove from organization',
      closeRoleText: 'Are you sure you want to remove {email} from this organization?',
      closeRoleConfirm: 'Remove',
      revokeInvitationTitle: 'Revoke invitation',
      revokeInvitationText: 'Are you sure you want to revoke the invitation for {email}?',
      revokeInvitationConfirm: 'Revoke',
    },
  };

</script>


<style lang="scss" scoped>

  .loader {
    margin: 48px auto;
    text-align: center;
  }

</style>
