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
      text:
        'Thanks for registering! To finish creating your account, please check your email for an activation link.',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
