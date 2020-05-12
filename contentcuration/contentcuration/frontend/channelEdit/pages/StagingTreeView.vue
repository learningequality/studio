<template>

  <div>Staging ({{ nodeId }})</div>

</template>

<script>

  export default {
    name: 'StagingTreeView',
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
  };

</script>
