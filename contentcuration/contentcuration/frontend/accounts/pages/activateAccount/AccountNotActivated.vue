<template>

  <MessageLayout
    :header="$tr('title')"
    :text="$tr('text')"
  >
    <KRouterLink
      primary
      :text="$tr('requestNewLink')"
      :to="{ name: 'RequestNewActivationLink' }"
      appearance="raised-button"
    />
  </MessageLayout>

</template>


<script>

  import MessageLayout from '../../components/MessageLayout';

  export default {
    name: 'AccountNotActivated',
    components: {
      MessageLayout,
    },
    $trs: {
      title: 'Account has not been activated',
      text: 'Please check your email for an activation link or request a new link.',
      requestNewLink: 'Request a new activation link',
    },
  };

</script>
