<template>

  <div class="invite-organization-user-form">
    <h2>{{ $tr('inviteUsers') }}</h2>

    <div class="fields">
      <KTextbox
        v-model="email"
        type="email"
        data-test="email-input"
        :label="$tr('emailLabel')"
        :invalid="Boolean(emailError)"
        :invalidText="emailError"
        :showInvalidText="Boolean(emailError)"
        @input="emailError = ''"
      />
      <KSelect
        v-model="role"
        data-test="role-select"
        :label="$tr('roleLabel')"
        :options="roleOptions"
      />
    </div>

    <KButton
      appearance="raised-button"
      primary
      :text="$tr('sendInvitation')"
      :disabled="sending"
      @click="submit"
    />
  </div>

</template>


<script>

  import { InvitationShareModes } from '../../constants';
  import useSnackbar from 'shared/composables/useSnackbar';

  export default {
    name: 'InviteOrganizationUserForm',
    setup() {
      const { createSnackbar } = useSnackbar();
      return { createSnackbar };
    },
    props: {
      organizationId: {
        type: String,
        required: true,
      },
      sendInvitation: {
        type: Function,
        required: true,
      },
    },
    data() {
      return {
        email: '',
        role: null,
        emailError: '',
        sending: false,
      };
    },
    computed: {
      roleOptions() {
        return [
          { label: this.$tr('viewerRole'), value: InvitationShareModes.VIEW_ONLY },
          { label: this.$tr('editorRole'), value: InvitationShareModes.EDIT },
          { label: this.$tr('adminRole'), value: InvitationShareModes.ADMIN },
        ];
      },
    },
    created() {
      this.role = this.roleOptions[0];
    },
    methods: {
      submit() {
        const email = this.email.trim();
        if (!email) {
          this.emailError = this.$tr('emailRequired');
          return;
        }
        this.sending = true;
        this.sendInvitation({
          organizationId: this.organizationId,
          email,
          shareMode: this.role.value,
        })
          .then(() => {
            this.email = '';
            this.role = this.roleOptions[0];
            this.createSnackbar(this.$tr('invitationSent'));
          })
          .finally(() => {
            this.sending = false;
          });
      },
    },
    $trs: {
      inviteUsers: 'Invite users',
      emailLabel: 'Email',
      emailRequired: 'Email is required',
      roleLabel: 'Role type',
      viewerRole: 'Viewer',
      editorRole: 'Editor',
      adminRole: 'Admin',
      sendInvitation: 'Send invitation',
      invitationSent: 'Invitation sent',
    },
  };

</script>


<style lang="scss" scoped>

  .fields {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-start;
    margin-top: 8px;

    > * {
      flex: 1 1 260px;
    }
  }

</style>
