<template>

  <MessageLayout :header="$tr('accountCreatedTitle')">
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
    name: 'AccountCreated',
    components: {
      MessageLayout,
    },
    $trs: {
      accountCreatedTitle: 'Account successfully created',
      backToLogin: 'Continue to sign-in page',
    },
  };

</script>
