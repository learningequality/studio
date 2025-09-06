<template>

  <MessageLayout :header="$tr('accountDeletedTitle')">
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
