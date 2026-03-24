<template>

  <StudioMessageLayout
    :header="$tr('resetExpiredTitle')"
    :text="$tr('resetExpiredText')"
  >
    <KRouterLink
      primary
      :text="$tr('requestNewLink')"
      :to="{ name: 'ForgotPassword' }"
      appearance="raised-button"
    />
  </StudioMessageLayout>

</template>


<script>

  import StudioMessageLayout from '../../components/StudioMessageLayout';

  export default {
    name: 'ResetLinkExpired',
    components: {
      StudioMessageLayout,
    },
    $trs: {
      resetExpiredTitle: 'Reset link expired',
      resetExpiredText: 'This password reset link has been used already or has expired.',
      requestNewLink: 'Request a new password reset link',
    },
  };

</script>
