<template>

  <MessageLayout
    :header="$tr('accountCreatedTitle')"
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
    name: 'AccountCreated',
    components: {
      MessageLayout,
    },
    $trs: {
      accountCreatedTitle: 'Account successfully created',
      continueToSignIn: 'Continue to sign-in',
    },
  };

</script>
