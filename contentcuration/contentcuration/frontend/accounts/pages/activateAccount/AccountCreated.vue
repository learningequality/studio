<template>

  <MessageLayout :header="$tr('accountCreatedTitle')">
    <template #back>
      <VBtn
        color="primary"
        :to="{ name: 'Main' }"
        large
      >
        {{ $tr('backToLogin') }}
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
      backToLogin: 'Continue to sign-in page',
    },
  };

</script>
