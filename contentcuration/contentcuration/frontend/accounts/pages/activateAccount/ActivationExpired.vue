<template>

  <StudioMessageLayout
    :header="$tr('activationExpiredTitle')"
    :text="$tr('activationExpiredText')"
  >
    <KRouterLink
      primary
      :text="$tr('requestNewLink')"
      :to="{ name: 'RequestNewActivationLink' }"
      appearance="raised-button"
    />
  </StudioMessageLayout>

</template>


<script>

  import StudioMessageLayout from '../../components/StudioMessageLayout';

  export default {
    name: 'ActivationExpired',
    components: {
      StudioMessageLayout,
    },
    $trs: {
      activationExpiredTitle: 'Activation failed',
      activationExpiredText: 'This activation link has been used already or has expired.',
      requestNewLink: 'Request a new activation link',
    },
  };

</script>
