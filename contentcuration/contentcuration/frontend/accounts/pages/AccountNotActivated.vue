<template>

  <MessageLayout
    :header="$tr('title')"
    :text="$tr('text')"
  >
    <VBtn color="primary" large :to="{name: 'Main'}">
      {{ $tr('requestNewLink') }}
    </VBtn>
    <p class="mt-4">
      <ActionLink :to="{name: 'Main'}" :text="$tr('backToSignIn')" />
    </p>
  </MessageLayout>

</template>


<script>

  import MessageLayout from '../components/MessageLayout';
  import ActionLink from 'shared/views/ActionLink';

  export default {
    name: 'AccountNotActivated',
    components: {
      MessageLayout,
      ActionLink,
    },
    $trs: {
      title: 'Account has not been activated',
      text:
        'This acccount has not been activated yet. Please check your email for an activation link or request a new link.',
      requestNewLink: 'Request a new link',
      backToSignIn: 'Back to sign in',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
