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
        'If an account exists with the email you provided, you should receive instrutions shortly. If you didn’t receive an email, please check your spam folder. ',
    },
  };

</script>
