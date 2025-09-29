<template>

  <MessageLayout
    :header="$tr('resetPasswordTitle')"
    :text="$tr('resetPasswordPrompt')"
  >
    <VForm
      ref="form"
      lazy-validation
      @submit.prevent="submit"
    >
      <Banner
        :text="$tr('resetPasswordFailed')"
        :value="error"
        error
        class="mb-4"
      />
      <PasswordField
        v-model="new_password1"
        :label="$tr('passwordLabel')"
        :additionalRules="passwordValidationRules"
        autofocus
      />
      <PasswordField
        v-model="new_password2"
        :label="$tr('passwordConfirmLabel')"
        :additionalRules="passwordConfirmRules"
      />
      <KButton
        primary
        class="w-100"
        :text="$tr('submitButton')"
        type="submit"
      />
    </VForm>
  </MessageLayout>

</template>


<script>

  import { mapActions } from 'vuex';
  import MessageLayout from '../../components/MessageLayout';
  import PasswordField from 'shared/views/form/PasswordField';
  import Banner from 'shared/views/Banner';

  export default {
    name: 'ResetPassword',
    components: {
      MessageLayout,
      PasswordField,
      Banner,
    },
    data() {
      return {
        new_password1: '',
        new_password2: '',
        error: false,
      };
    },
    computed: {
      passwordConfirmRules() {
        return [value => (this.new_password1 === value ? true : this.$tr('passwordMatchMessage'))];
      },
      passwordValidationRules() {
        return [value => (value.length >= 8 ? true : this.$tr('passwordValidationMessage'))];
      },
    },
    methods: {
      ...mapActions('account', ['setPassword']),
      submit() {
        this.error = false;
        if (this.$refs.form.validate()) {
          const payload = {
            ...this.$route.query,
            new_password1: this.new_password1,
            new_password2: this.new_password2,
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
        }
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

  .w-100 {
    width: 100%;
  }

</style>
