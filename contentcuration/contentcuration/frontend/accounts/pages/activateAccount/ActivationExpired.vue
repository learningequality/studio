<template>

  <MessageLayout
    :header="$tr('activationExpiredTitle')"
    :text="$tr('activationExpiredText')"
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
    name: 'ActivationExpired',
    components: {
      MessageLayout,
    },
    $trs: {
      activationExpiredTitle: 'Activation failed',
      activationExpiredText: 'This activation link has been used already or has expired.',
      requestNewLink: 'Request a new activation link',
    },
  };

</script>
