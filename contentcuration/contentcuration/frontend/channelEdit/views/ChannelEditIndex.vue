<template>

  <VApp>
    <router-view />
    <PolicyUpdates />
  </VApp>

</template>

<script>

  import PolicyUpdates from 'shared/views/policies/PolicyUpdates';

  export default {
    name: 'ChannelEditIndex',
    components: {
      PolicyUpdates,
    },
  };

</script>
