<template>

  <MessageLayout
    :header="$tr('passwordInstructionsHeader')"
    :text="$tr('passwordInstructionsText')"
  />

</template>


<script>

  import MessageLayout from '../../components/MessageLayout';

  export default {
    name: 'PasswordInstructionsSent',
    components: {
      MessageLayout,
    },
    $trs: {
      passwordInstructionsHeader: 'Instructions sent. Thank you!',
      passwordInstructionsText:
        'If an account exists with the email you provided, you should receive instrutions shortly. If you didn’t receive an email, please check your spam folder.',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
