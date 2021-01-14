<template>

  <MessageLayout
    :header="$tr('activationReSentTitle')"
    :text="$tr('activationReSentText')"
  />

</template>


<script>

  import MessageLayout from '../../components/MessageLayout';

  export default {
    name: 'ActivationLinkReSent',
    components: {
      MessageLayout,
    },
    $trs: {
      activationReSentTitle: 'Instructions sent. Thank you!',
      activationReSentText:
        "If there is already an account with the email address provided, you should receive instructions shortly. If you don't see an email from us, please check your spam folder.",
    },
  };

</script>
