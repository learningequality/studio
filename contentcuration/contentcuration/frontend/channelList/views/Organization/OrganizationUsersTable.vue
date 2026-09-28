<template>

  <div class="organization-users-table">
    <h2>{{ organizationStrings.users$() }}</h2>

    <div
      v-if="show('loader', loading, 500)"
      class="loader"
    >
      <KCircularLoader />
    </div>

    <KTable
      v-else
      :caption="organizationStrings.users$()"
      :headers="headers"
      :rows="rows"
    >
      <template #cell="{ content, colIndex, rowIndex }">
        <span v-if="colIndex < 3">{{ content }}</span>
        <KIconButton
          v-else-if="!isSoleActiveAdmin(rows[rowIndex][3])"
          icon="optionsVertical"
          appearance="flat-button"
          :ariaLabel="organizationStrings.optionsFor$({ email: rows[rowIndex][1] })"
        >
          <template #menu>
            <KDropdownMenu
              :options="menuOptions(rows[rowIndex][3])"
              @select="option => handleSelect(option, rows[rowIndex][3])"
            />
          </template>
        </KIconButton>
        <span v-else></span>
      </template>
    </KTable>

    <KModal
      v-if="closeTarget"
      :title="organizationStrings.closeRoleTitle$()"
      :submitText="organizationStrings.closeRoleConfirm$()"
      :cancelText="organizationStrings.cancel$()"
      @submit="confirmClose"
      @cancel="closeTarget = null"
    >
      {{ organizationStrings.closeRoleText$({ email: closeTarget.email }) }}
    </KModal>

    <KModal
      v-if="revokeTarget"
      :title="organizationStrings.revokeInvitationTitle$()"
      :submitText="organizationStrings.revokeInvitationConfirm$()"
      :cancelText="organizationStrings.cancel$()"
      @submit="confirmRevoke"
      @cancel="revokeTarget = null"
    >
      {{ organizationStrings.revokeInvitationText$({ email: revokeTarget.email }) }}
    </KModal>
  </div>

</template>


<script>

  import useKShow from 'kolibri-design-system/lib/composables/useKShow';
  import { OrganizationRoles, InvitationShareModes } from '../../constants';
  import { getApiErrorMessage } from '../../utils';
  import { organizationStrings } from 'shared/strings/organizationStrings';
  import useSnackbar from 'shared/composables/useSnackbar';

  const roleLabels = {
    [OrganizationRoles.ADMIN]: 'adminRole',
    [OrganizationRoles.EDITOR]: 'editorRole',
    [OrganizationRoles.VIEWER]: 'viewerRole',
  };

  const pendingRoleLabels = {
    [OrganizationRoles.ADMIN]: 'pendingAdminRole',
    [OrganizationRoles.EDITOR]: 'pendingEditorRole',
    [OrganizationRoles.VIEWER]: 'pendingViewerRole',
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
      return { show, createSnackbar, organizationStrings };
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
          { label: organizationStrings.name$(), dataType: 'string', columnId: 'name' },
          { label: organizationStrings.email$(), dataType: 'string', columnId: 'email' },
          { label: organizationStrings.role$(), dataType: 'string', columnId: 'role' },
          { label: organizationStrings.options$(), dataType: 'undefined', columnId: 'options' },
        ];
      },
      rows() {
        const memberRows = this.members.map(member => [
          member.user_name || member.user_email,
          member.user_email,
          organizationStrings[`${roleLabels[member.role] || member.role}$`](),
          { type: 'member', id: member.id, email: member.user_email },
        ]);
        const invitationRows = this.invitations.map(invitation => [
          `${invitation.first_name || ''} ${invitation.last_name || ''}`.trim() || invitation.email,
          invitation.email,
          organizationStrings[
            `${pendingRoleLabels[shareModeToRole[invitation.share_mode]] || 'pendingViewerRole'}$`
          ](),
          { type: 'pending', id: invitation.id, email: invitation.email },
        ]);
        return memberRows.concat(invitationRows);
      },
    },
    methods: {
      isSoleActiveAdmin(target) {
        if (target.type !== 'member') {
          return false;
        }
        const activeAdmins = this.members.filter(member => member.role === OrganizationRoles.ADMIN);
        return activeAdmins.length === 1 && activeAdmins[0].id === target.id;
      },
      menuOptions(target) {
        if (target.type === 'pending') {
          return [
            { label: organizationStrings.resendInvitation$(), value: 'resend' },
            { label: organizationStrings.revokeInvitation$(), value: 'revoke' },
          ];
        }
        return [
          { label: organizationStrings.makeViewer$(), value: OrganizationRoles.VIEWER },
          { label: organizationStrings.makeEditor$(), value: OrganizationRoles.EDITOR },
          { label: organizationStrings.makeAdmin$(), value: OrganizationRoles.ADMIN },
          { label: organizationStrings.closeRole$(), value: 'close' },
        ];
      },
      handleSelect(option, target) {
        if (target.type === 'pending') {
          if (option.value === 'resend') {
            this.resendInvitation(target.id)
              .then(() => {
                this.createSnackbar(organizationStrings.invitationResent$());
              })
              .catch(error => {
                this.handleMembershipError(error);
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
            this.createSnackbar(organizationStrings.roleClosed$());
          })
          .catch(error => {
            this.handleMembershipError(error);
          });
      },
      confirmRevoke() {
        const target = this.revokeTarget;
        this.revokeTarget = null;
        this.revokeInvitation(target.id)
          .then(() => {
            this.createSnackbar(organizationStrings.invitationRevoked$());
          })
          .catch(error => {
            this.handleMembershipError(error);
          });
      },
      handleMembershipError(error) {
        this.createSnackbar(
          getApiErrorMessage(error, organizationStrings.genericMembershipError$()),
        );
      },
    },
  };

</script>


<style lang="scss" scoped>

  .loader {
    margin: 48px auto;
    text-align: center;
  }

</style>
