<template>

  <MessageLayout
    :header="$tr('accountDeletedTitle')"
  >
    <template #back>
      <VBtn color="primary" :to="{ name: 'Main' }" large>
        {{ $tr('continueToSignIn') }}
      </VBtn>
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
      continueToSignIn: 'Continue to sign-in page',
    },
  };

</script>
