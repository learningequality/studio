<template>

  <StudioMessageLayout
    :header="$tr('resetPasswordTitle')"
    :text="$tr('resetPasswordPrompt')"
  >
    <form
      class="reset-password-form"
      novalidate
      @submit.prevent="resetPassword"
    >
      <StudioBanner
        v-if="error"
        role="alert"
        error
        class="banner"
      >
        {{ $tr('resetPasswordFailed') }}
      </StudioBanner>
      <StudioPasswordField
        v-model="new_password1"
        autofocus
        :label="$tr('passwordLabel')"
        :errorMessages="
          touched.new_password1 && errors.new_password1 ? [new_password1ErrorText] : []
        "
        @blur="touched.new_password1 = true"
      />
      <StudioPasswordField
        v-model="new_password2"
        :label="$tr('passwordConfirmLabel')"
        :errorMessages="
          touched.new_password2 && errors.new_password2 ? [new_password2ErrorText] : []
        "
        @blur="touched.new_password2 = true"
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
  import StudioPasswordField from '../../components/form/StudioPasswordField';
  import StudioBanner from 'shared/views/StudioBanner';
  import commonStrings from 'shared/translator';
  import { generateFormMixin } from 'shared/mixins';

  const formMixin = generateFormMixin({
    new_password1: {
      required: true,
      validator: v => Boolean(v) && v.length >= 8,
    },
    new_password2: {
      required: true,
      validator: (v, vm) => Boolean(v) && v === vm.form.new_password1,
    },
  });

  export default {
    name: 'ResetPassword',
    components: {
      StudioMessageLayout,
      StudioPasswordField,
      StudioBanner,
    },
    mixins: [formMixin],
    data() {
      return {
        error: false,
        // Gates error display until blur, since formMixin's setters otherwise
        // mark errors on every keystroke. Create.vue has no equivalent gate,
        // so the two forms validate differently; epic-level decision tracked
        // on #5060.
        touched: {
          new_password1: false,
          new_password2: false,
        },
      };
    },
    computed: {
      new_password1ErrorText() {
        if (!this.new_password1) {
          /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
          return commonStrings.$tr('fieldRequired');
        }
        return this.$tr('passwordValidationMessage');
      },
      new_password2ErrorText() {
        if (!this.new_password2) {
          /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
          return commonStrings.$tr('fieldRequired');
        }
        return this.$tr('passwordMatchMessage');
      },
    },
    methods: {
      ...mapActions('account', ['setPassword']),
      resetPassword() {
        this.error = false;
        this.touched.new_password1 = true;
        this.touched.new_password2 = true;

        // Validate against this.form rather than formMixin's clean(), which
        // trims every field. Passwords must keep the leading/trailing spaces
        // the user typed, both here and in the payload below.
        if (!this.validate(this.form)) {
          return;
        }

        const payload = {
          ...this.$route.query,
          new_password1: this.form.new_password1,
          new_password2: this.form.new_password2,
        };
        this.setPassword(payload)
          .then(() => {
            this.$router.push({
              name: 'ResetPasswordSuccess',
            });
          })
          .catch(() => {
            this.error = true;
          });
      },
    },
    $trs: {
      resetPasswordTitle: 'Reset your password',
      resetPasswordPrompt: 'Enter and confirm your new password',
      passwordLabel: 'New password',
      passwordConfirmLabel: 'Confirm password',
      passwordValidationMessage: 'Password should be at least 8 characters long',
      passwordMatchMessage: "Passwords don't match",
      submitButton: 'Submit',
      resetPasswordFailed: 'Failed to reset password. Please try again.',
    },
  };

</script>


<style lang="scss" scoped>

  .reset-password-form {
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
