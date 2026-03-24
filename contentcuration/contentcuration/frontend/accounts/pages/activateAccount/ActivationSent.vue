<template>

  <StudioMessageLayout
    :header="$tr('header')"
    :text="$tr('text')"
  />

</template>


<script>

  import StudioMessageLayout from '../../components/StudioMessageLayout';

  export default {
    name: 'ActivationSent',
    components: {
      StudioMessageLayout,
    },
    $trs: {
      header: 'Activation link sent',
      text: 'Thank you for creating an account! To complete the process, please check your email for the activation link we sent you.',
    },
  };

</script>
