<template>

  <MessageLayout
    :header="$tr('accountDeletedTitle')"
  />

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
    },
  };

</script>
