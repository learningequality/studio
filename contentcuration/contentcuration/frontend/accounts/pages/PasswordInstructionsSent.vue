<template>

  <MessageLayout
    :header="$tr('passwordInstructionsHeader')"
    :text="$tr('passwordInstructionsText')"
  >
    <ActionLink :text="$tr('backToLogin')" :to="{name: 'Main'}" />
  </MessageLayout>

</template>


<script>

  import MessageLayout from '../components/MessageLayout';
  import ActionLink from 'shared/views/ActionLink';

  export default {
    name: 'PasswordInstructionsSent',
    components: {
      MessageLayout,
      ActionLink,
    },
    $trs: {
      passwordInstructionsHeader: 'Instructions sent. Thank you!',
      passwordInstructionsText:
        'If an account exists with the email you provided, you should receive instrutions shortly. If you didn’t receive an email, please check your spam folder.',
      backToLogin: 'Back to sign in',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
