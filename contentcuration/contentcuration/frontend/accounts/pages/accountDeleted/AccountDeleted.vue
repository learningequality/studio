<template>

  <StudioMessageLayout :header="$tr('accountDeletedTitle')">
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

  import StudioMessageLayout from '../../components/MessageLayout';

  export default {
    name: 'AccountDeleted',
    components: {
      StudioMessageLayout,
    },
    $trs: {
      accountDeletedTitle: 'Account successfully deleted',
      backToLogin: 'Continue to sign-in page',
    },
  };

</script>
