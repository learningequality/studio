<template>

  <MessageLayout
    :header="$tr('resetPasswordTitle')"
    :text="$tr('resetPasswordPrompt')"
  >
    <VForm ref="form" lazy-validation @submit.prevent="submit">
      <PasswordField
        v-model="form.new_password1"
        :label="$tr('passwordLabel')"
        autofocus
      />
      <PasswordField
        v-model="form.new_password2"
        :label="$tr('passwordConfirmLabel')"
        :additionalRules="passwordConfirmRules"
      />
      <VBtn block color="primary" large type="submit">
        {{ $tr('submitButton') }}
      </VBtn>
    </VForm>
  </MessageLayout>

</template>

<script>

  import { mapActions } from 'vuex';
  import MessageLayout from '../../components/MessageLayout';
  import PasswordField from 'shared/views/form/PasswordField';

  export default {
    name: 'ResetPassword',
    components: {
      MessageLayout,
      PasswordField,
    },
    data() {
      return {
        form: {
          new_password1: '',
          new_password2: '',
        },
      };
    },
    computed: {
      passwordConfirmRules() {
        return [v => this.form.new_password1 === v || this.$tr('passwordMatchMessage')];
      },
    },
    methods: {
      ...mapActions('account', ['setPassword']),
      submit() {
        if (this.$refs.form.validate()) {
          let payload = {
            ...this.$route.query,
            ...this.form,
          };

          this.setPassword(payload).then(() => {
            this.$router.push({
              name: 'ResetPasswordSuccess',
            });
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
