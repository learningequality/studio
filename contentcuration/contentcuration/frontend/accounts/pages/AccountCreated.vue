<template>

  <MessageLayout
    :header="$tr('accountCreatedTitle')"
  >
    <VBtn color="primary" large :to="{name: 'Main'}">
      {{ $tr('goToLoginButton') }}
    </VBtn>
  </MessageLayout>

</template>


<script>

  import MessageLayout from '../components/MessageLayout';

  export default {
    name: 'AccountCreated',
    components: {
      MessageLayout,
    },
    $trs: {
      accountCreatedTitle: 'Account successfully created',
      goToLoginButton: 'Continue to sign in',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
