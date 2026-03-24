<template>

  <StudioMessageLayout
    :header="$tr('passwordInstructionsHeader')"
    :text="$tr('passwordInstructionsText')"
  />

</template>


<script>

  import StudioMessageLayout from '../../components/StudioMessageLayout';

  export default {
    name: 'PasswordInstructionsSent',
    components: {
      StudioMessageLayout,
    },
    $trs: {
      passwordInstructionsHeader: 'Instructions sent. Thank you!',
      passwordInstructionsText:
        "If there is already an account with the email address provided, you should receive the instructions shortly. If you don't see an email from us, please check your spam folder.",
    },
  };

</script>
