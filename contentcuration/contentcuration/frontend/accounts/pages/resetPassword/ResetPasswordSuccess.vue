<template>

  <StudioMessageLayout
    :header="$tr('header')"
    :text="$tr('text')"
  />

</template>


<script>

  import StudioMessageLayout from '../../components/StudioMessageLayout';

  export default {
    name: 'ResetPasswordSuccess',
    components: {
      StudioMessageLayout,
    },
    $trs: {
      header: 'Password reset successfully',
      text: 'Your password has been reset. You may sign in now.',
    },
  };

</script>
