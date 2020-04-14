<template>

  <MessageLayout
    :header="$tr('forgotPasswordTitle')"
    :text="$tr('forgotPasswordPrompt')"
  >
    <VForm ref="form" lazy-validation @submit.prevent="submit">
      <EmailField v-model="email" autofocus />
      <VBtn block color="primary" large type="submit">
        {{ $tr('submitButton') }}
      </VBtn>
    </VForm>
  </MessageLayout>

</template>


<script>

  import { mapActions } from 'vuex';
  import MessageLayout from '../../components/MessageLayout';
  import EmailField from 'shared/views/form/EmailField';

  export default {
    name: 'ForgotPassword',
    components: {
      MessageLayout,
      EmailField,
    },
    data() {
      return {
        email: '',
      };
    },
    methods: {
      ...mapActions('account', ['sendPasswordResetLink']),
      submit() {
        if (this.$refs.form.validate()) {
          this.sendPasswordResetLink(this.email).then(() => {
            this.$router.push({
              name: 'PasswordInstructionsSent',
            });
          });
        }
      },
    },
    $trs: {
      forgotPasswordTitle: 'Forgot password',
      forgotPasswordPrompt:
        "Provide your email address and we'll send you instructions to reset your password",
      submitButton: 'Submit',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
