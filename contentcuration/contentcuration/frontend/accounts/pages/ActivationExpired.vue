<template>

  <MessageLayout
    :header="$tr('activationExpiredTitle')"
    :text="$tr('activationExpiredText')"
  >
    <VBtn color="primary" large :to="{name: 'Main'}">
      {{ $tr('requestNewLink') }}
    </VBtn>
  </MessageLayout>

</template>


<script>

  import MessageLayout from '../components/MessageLayout';

  export default {
    name: 'ActivationExpired',
    components: {
      MessageLayout,
    },
    $trs: {
      activationExpiredTitle: 'Activation link expired',
      activationExpiredText: 'This activation link has been used already or has expired.',
      requestNewLink: 'Try signing in',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
