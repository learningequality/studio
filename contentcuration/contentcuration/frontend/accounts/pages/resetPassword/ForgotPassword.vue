<template>

  <MessageLayout
    :header="$tr('forgotPasswordTitle')"
    :text="$tr('forgotPasswordPrompt')"
  >
    <VForm ref="form" lazy-validation @submit.prevent="submit">
      <Banner :text="$tr('forgotPasswordFailed')" :value="error" error class="mb-4" />
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
              this.$router.push({
                name: 'PasswordInstructionsSent',
              });
            })
            .catch(() => {
              this.error = true;
            });
        }
      },
    },
    $trs: {
      forgotPasswordTitle: 'Forgot password',
      forgotPasswordPrompt:
        "Provide your email address and we'll send you instructions to reset your password",
      submitButton: 'Submit',
      forgotPasswordFailed: 'Failed to send a password reset link. Please try again.',
    },
  };

</script>
