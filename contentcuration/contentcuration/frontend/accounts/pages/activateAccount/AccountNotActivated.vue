<template>

  <StudioMessageLayout
    :header="$tr('title')"
    :text="$tr('text')"
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
    name: 'AccountNotActivated',
    components: {
      StudioMessageLayout,
    },
    $trs: {
      title: 'Account has not been activated',
      text: 'Please check your email for an activation link or request a new link.',
      requestNewLink: 'Request a new activation link',
    },
  };

</script>
