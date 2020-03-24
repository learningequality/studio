<template>

  <MessageLayout
    :header="$tr('forgotPasswordTitle')"
    :text="$tr('forgotPasswordPrompt')"
  >
    <VForm ref="form" lazy-validation style="max-width: 400px; margin: 0 auto;">
      <EmailField v-model="email" />
      <VBtn block color="primary" large @click="submit">
        {{ $tr('submitButton') }}
      </VBtn>
    </VForm>
  </MessageLayout>

</template>


<script>

  import MessageLayout from '../components/MessageLayout';
  import EmailField from '../components/EmailField';

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
      submit() {
        if (this.$refs.form.validate()) {
          this.$router.push({
            name: 'PasswordInstructionsSent',
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
