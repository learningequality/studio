<template>

  <MessageLayout
    :header="$tr('header')"
    :text="$tr('text')"
  >
    <ActionLink
      :to="{ name: 'Main' }"
      :text="$tr('back')"
    />
  </MessageLayout>

</template>


<script>

  import MessageLayout from '../components/MessageLayout';
  import ActionLink from 'shared/views/ActionLink';

  export default {
    name: 'ActivationSent',
    components: {
      MessageLayout,
      ActionLink,
    },
    $trs: {
      header: 'Activation link sent',
      text:
        'Thanks for registering! To finish creating your account, please check your email for an activation link.',
      back: 'Back to sign in',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
