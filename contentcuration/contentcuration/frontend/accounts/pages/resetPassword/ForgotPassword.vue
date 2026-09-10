<template>

  <StudioMessageLayout
    :header="$tr('forgotPasswordTitle')"
    :text="$tr('forgotPasswordPrompt')"
  >
    <form
      ref="form"
      novalidate
      @submit.prevent="submit"
    >
      <StudioBanner
        v-if="error"
        error
        class="mb-4"
        data-testid="error-banner"
      >
        {{ $tr('forgotPasswordFailed') }}
      </StudioBanner>

      <StudioEmailField
        v-model="email"
        autofocus
        :error-messages="emailErrors"
        @blur="showEmailError"
        @input="hideEmailError"
        @click.native="hideEmailError"
      />

      <KButton
        primary
        class="w-100"
        :text="$tr('submitButton')"
        type="submit"
      />
    </form>
  </StudioMessageLayout>

</template>


<script>

  import { mapActions } from 'vuex';
  import StudioMessageLayout from '../../components/StudioMessageLayout';
  import StudioEmailField from '../../components/form/StudioEmailField';
  import StudioBanner from '../../../shared/views/StudioBanner';
  import { generateFormMixin } from '../../../shared/mixins.js';

  const formFields = {
    email: {
      required: true,
      validator: value => Boolean(value && /.+@.+\..+/.test(value)),
    },
  };

  export default {
    name: 'ForgotPassword',

    mixins: [generateFormMixin(formFields)],

    components: {
      StudioMessageLayout,
      StudioEmailField,
      StudioBanner,
    },

    data() {
      return {
        error: false,
        emailValidationVisible: false,
      };
    },

    computed: {
      emailErrors() {
        if (!this.emailValidationVisible || !this.errors.email) {
          return [];
        }

        return [this.$tr('validEmailMessage')];
      },
    },

    methods: {
      ...mapActions('account', ['sendPasswordResetLink']),

      hideEmailError() {
        this.emailValidationVisible = false;
      },

      showEmailError() {
        this.emailValidationVisible = true;
      },

      submit() {
        this.error = false;

        const formData = this.clean();

        if (!this.validate(formData)) {
          this.emailValidationVisible = true;
          return;
        }

        this.sendPasswordResetLink(formData.email)
          .then(() => {
            this.$router
              .push({
                name: 'PasswordInstructionsSent',
              })
              .catch(() => {});
          })
          .catch(() => {
            this.error = true;
          });
      },
    },

    $trs: {
      forgotPasswordTitle: 'Reset your password',
      forgotPasswordPrompt:
        'Please enter your email address to receive instructions for resetting your password',
      submitButton: 'Submit',
      forgotPasswordFailed: 'Failed to send a password reset link. Please try again.',
      validEmailMessage: 'Please enter a valid email',
    },
  };

</script>


<style lang="scss" scoped>

  .w-100 {
    width: 100%;
  }

</style>
