<template>

  <MessageLayout
    :header="$tr('header')"
    :text="$tr('text')"
  />

</template>


<script>

  import MessageLayout from '../../components/MessageLayout';

  export default {
    name: 'ResetPasswordSuccess',
    components: {
      MessageLayout,
    },
    $trs: {
      header: 'Password reset successfully',
      text: 'Your password has been reset. You may sign in now.',
    },
  };

</script>
