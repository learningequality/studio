<template>

  <div class="invite-organization-user-form">
    <h2>{{ organizationStrings.inviteUsers$() }}</h2>

    <div class="fields">
      <KTextbox
        v-model="email"
        type="email"
        data-test="email-input"
        :label="organizationStrings.emailLabel$()"
        :invalid="Boolean(emailError)"
        :invalidText="emailError"
        :showInvalidText="Boolean(emailError)"
        @input="emailError = ''"
      />
      <KSelect
        v-model="role"
        data-test="role-select"
        :label="organizationStrings.roleLabel$()"
        :options="roleOptions"
      />
    </div>

    <KButton
      appearance="raised-button"
      primary
      :text="organizationStrings.sendInvitation$()"
      :disabled="sending"
      @click="submit"
    />
  </div>

</template>


<script>

  import { InvitationShareModes } from '../../constants';
  import { getApiErrorMessage } from '../../utils';
  import { organizationStrings } from 'shared/strings/organizationStrings';
  import useSnackbar from 'shared/composables/useSnackbar';

  export default {
    name: 'InviteOrganizationUserForm',
    setup() {
      const { createSnackbar } = useSnackbar();
      return { createSnackbar, organizationStrings };
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
          { label: organizationStrings.viewerRole$(), value: InvitationShareModes.VIEW_ONLY },
          { label: organizationStrings.editorRole$(), value: InvitationShareModes.EDIT },
          { label: organizationStrings.adminRole$(), value: InvitationShareModes.ADMIN },
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
          this.emailError = organizationStrings.emailRequired$();
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
            this.createSnackbar(organizationStrings.invitationSent$());
          })
          .catch(error => {
            this.createSnackbar(getApiErrorMessage(error, organizationStrings.invitationError$()));
          })
          .finally(() => {
            this.sending = false;
          });
      },
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
