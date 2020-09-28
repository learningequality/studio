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
        "If there is already an account with the email address provided, you should receive the instructions shortly. If you don't see an email from us, please check your spam folder.",
    },
  };

</script>
