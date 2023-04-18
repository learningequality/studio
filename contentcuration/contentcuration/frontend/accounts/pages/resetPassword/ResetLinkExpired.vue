<template>

  <MessageLayout
    :header="$tr('resetExpiredTitle')"
    :text="$tr('resetExpiredText')"
  >
    <KRouterLink
      primary
      :text="$tr('requestNewLink')"
      :to="{ name: 'ForgotPassword' }"
      appearance="raised-button"
    />
  </MessageLayout>

</template>


<script>

  import MessageLayout from '../../components/MessageLayout';

  export default {
    name: 'ResetLinkExpired',
    components: {
      MessageLayout,
    },
    $trs: {
      resetExpiredTitle: 'Reset link expired',
      resetExpiredText: 'This password reset link has been used already or has expired.',
      requestNewLink: 'Request a new password reset link',
    },
  };

</script>
