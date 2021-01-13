<template>

  <MessageLayout
    :header="$tr('resetExpiredTitle')"
    :text="$tr('resetExpiredText')"
  >
    <VBtn color="primary" large :to="{ name: 'ForgotPassword' }" class="mb-4">
      {{ $tr('requestNewLink') }}
    </VBtn>
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
