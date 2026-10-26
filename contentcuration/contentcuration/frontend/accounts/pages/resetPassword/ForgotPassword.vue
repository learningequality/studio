<template>

  <StudioMessageLayout
    :header="$tr('forgotPasswordTitle')"
    :text="$tr('forgotPasswordPrompt')"
  >
    <form
      class="forgot-password-form"
      novalidate
      @submit.prevent="submit"
    >
      <StudioBanner
        v-if="error"
        error
        class="banner"
        data-testid="error-banner"
      >
        {{ $tr('forgotPasswordFailed') }}
      </StudioBanner>
      <StudioEmailField
        v-model="email"
        autofocus
        data-testid="email-field"
        :label="$tr('emailLabel')"
        :errorMessages="showEmailError && errors.email ? [emailErrorText] : []"
        @blur="showEmailError = true"
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
  import StudioBanner from 'shared/views/StudioBanner';
  import commonStrings from 'shared/translator';
  import { generateFormMixin } from 'shared/mixins';

  const formMixin = generateFormMixin({
    email: {
      required: true,
      validator: v => Boolean(v && v.trim()) && /.+@.+\..+/.test(v),
    },
  });

  export default {
    name: 'ForgotPassword',
    components: {
      StudioMessageLayout,
      StudioEmailField,
      StudioBanner,
    },
    mixins: [formMixin],
    data() {
      return {
        error: false,
        showEmailError: false,
      };
    },
    computed: {
      emailErrorText() {
        if (!this.email || !this.email.trim()) {
          /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
          return commonStrings.$tr('fieldRequired');
        }
        return this.$tr('emailValidationMessage');
      },
    },
    methods: {
      ...mapActions('account', ['sendPasswordResetLink']),
      submit() {
        this.error = false;
        this.showEmailError = true;
        const formData = this.clean();
        if (this.validate(formData)) {
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
        }
      },
    },
    $trs: {
      forgotPasswordTitle: 'Reset your password',
      forgotPasswordPrompt:
        'Please enter your email address to receive instructions for resetting your password',
      submitButton: 'Submit',
      forgotPasswordFailed: 'Failed to send a password reset link. Please try again.',
      emailLabel: 'Email',
      emailValidationMessage: 'Please enter a valid email',
    },
  };

</script>


<style lang="scss" scoped>

  .forgot-password-form {
    width: 400px;
    max-width: 100%;
    text-align: left;
  }

  .banner {
    width: 100%;
    margin-bottom: 16px;
  }

  .w-100 {
    width: 100%;
  }

</style>
