<template>

  <StudioMessageLayout :header="$tr('accountCreatedTitle')">
    <template #back>
      <KRouterLink
        :to="{ name: 'Main' }"
        :text="$tr('backToLogin')"
        :primary="true"
        appearance="raised-button"
      />
    </template>
  </StudioMessageLayout>

</template>


<script>

  import StudioMessageLayout from '../../components/StudioMessageLayout';

  export default {
    name: 'AccountCreated',
    components: {
      StudioMessageLayout,
    },
    $trs: {
      accountCreatedTitle: 'Account successfully created',
      backToLogin: 'Continue to sign-in page',
    },
  };

</script>
