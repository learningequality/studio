<template>

  <MessageLayout
    :header="$tr('resetPasswordTitle')"
    :text="$tr('resetPasswordPrompt')"
  >
    <VForm ref="form" lazy-validation style="max-width: 400px; margin: 0 auto;">
      <PasswordField
        v-model="password"
        :label="$tr('passwordLabel')"
      />
      <PasswordField
        v-model="passwordConfirm"
        :label="$tr('passwordConfirmLabel')"
        :additionalRules="passwordConfirmRules"
      />
      <VBtn block color="primary" large @click="submit">
        {{ $tr('submitButton') }}
      </VBtn>
    </VForm>
  </MessageLayout>

</template>

<script>

  import MessageLayout from '../../components/MessageLayout';
  import PasswordField from '../../components/PasswordField';

  export default {
    name: 'ResetPassword',
    components: {
      MessageLayout,
      PasswordField,
    },
    data() {
      return {
        password: '',
        passwordConfirm: '',
      };
    },
    computed: {
      passwordConfirmRules() {
        return [v => this.password === v || this.$tr('passwordMatchMessage')];
      },
    },
    methods: {
      submit() {
        if (this.$refs.form.validate()) {
          this.$router.push({
            name: 'ResetPasswordSuccess',
          });
        }
      },
    },
    $trs: {
      resetPasswordTitle: 'Reset your password',
      resetPasswordPrompt: 'Enter and confirm your new password',
      passwordLabel: 'New password',
      passwordConfirmLabel: 'Confirm password',
      passwordMatchMessage: "Passwords don't match",
      submitButton: 'Submit',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
