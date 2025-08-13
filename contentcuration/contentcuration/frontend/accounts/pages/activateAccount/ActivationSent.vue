<template>

  <MessageLayout
    :header="$tr('header')"
    :text="$tr('text')"
  />

</template>


<script>

  import MessageLayout from '../../components/MessageLayout';

  export default {
    name: 'ActivationSent',
    components: {
      MessageLayout,
    },
    $trs: {
      header: 'Activation link sent',
      text: 'Thank you for creating an account! To complete the process, please check your email for the activation link we sent you.',
    },
  };

</script>
