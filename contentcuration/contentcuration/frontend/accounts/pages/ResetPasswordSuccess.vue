<template>

  <MessageLayout
    :header="$tr('header')"
    :text="$tr('text')"
  >
    <VBtn :to="{ name: 'Main' }" large block color="primary">
      {{ $tr('back') }}
    </VBtn>
  </MessageLayout>

</template>


<script>

  import MessageLayout from '../components/MessageLayout';

  export default {
    name: 'ResetPasswordSuccess',
    components: {
      MessageLayout,
    },
    $trs: {
      header: 'Password reset successfully',
      text: 'Your password has been reset. You may sign in now.',
      back: 'Back to sign in',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
