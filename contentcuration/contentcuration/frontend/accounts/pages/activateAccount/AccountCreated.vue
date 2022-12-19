<template>

  <MessageLayout
    :header="$tr('accountCreatedTitle')"
  />

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
    },
  };

</script>
