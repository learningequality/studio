<template>

  <div
    class="large-loader"
    data-testid="loader"
  >
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
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 24px;
  }

</style>
