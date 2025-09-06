<template>

  <MessageLayout :header="$tr('accountCreatedTitle')">
    <template #back>
      <KButton
        appearance="raised-button"
        :primary="true"
        :text="$tr('backToLogin')"
        @click="$router.push({ name: 'Main' })"
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
