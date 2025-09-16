<template>

  <MessageLayout :header="$tr('accountDeletedTitle')">
    <template #back>
      <KRouterLink
        :to="{ name: 'Main' }"
        :text="$tr('backToLogin')"
        :primary="true"
        appearance="raised-button"
      />
    </template>
  </MessageLayout>

</template>


<script>

  import MessageLayout from '../../components/MessageLayout';

  export default {
    name: 'AccountDeleted',
    components: {
      MessageLayout,
    },
    $trs: {
      accountDeletedTitle: 'Account successfully deleted',
      backToLogin: 'Continue to sign-in page',
    },
  };

</script>
