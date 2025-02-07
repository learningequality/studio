<template>

  <MessageLayout
    :header="$tr('forgotPasswordTitle')"
    :text="$tr('forgotPasswordPrompt')"
  >
    <VForm ref="form" lazy-validation @submit.prevent="submit">
      <Banner :text="$tr('forgotPasswordFailed')" :value="error" error class="mb-4" />
      <EmailField v-model="email" autofocus />
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
  import EmailField from 'shared/views/form/EmailField';
  import Banner from 'shared/views/Banner';

  export default {
    name: 'ForgotPassword',
    components: {
      MessageLayout,
      EmailField,
      Banner,
    },
    data() {
      return {
        email: '',
        error: false,
      };
    },
    methods: {
      ...mapActions('account', ['sendPasswordResetLink']),
      submit() {
        this.error = false;
        if (this.$refs.form.validate()) {
          this.sendPasswordResetLink(this.email)
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
    },
  };

</script>

<style lang="less" scoped>

  .w-100 {
    width: 100%;
  }

</style>
