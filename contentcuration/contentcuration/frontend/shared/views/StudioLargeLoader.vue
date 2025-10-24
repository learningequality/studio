<template>

  <div class="large-loader">
    <KCircularLoader :size="70" />
  </div>

</template>


<script>

  export default {
    name: 'StudioLargeLoader',
  };

</script>


<style lang="scss" scoped>

  .large-loader {
    padding: 24px;
  }

</style>
