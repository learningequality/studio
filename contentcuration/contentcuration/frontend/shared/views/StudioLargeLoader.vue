<template>

  <div class="studio-large-loader">
    <KCircularLoader :size="70" />
  </div>

</template>


<script>

  import KCircularLoader from 'kolibri-design-system/lib/loaders/KCircularLoader.vue';

  export default {
    name: 'StudioLargeLoader',
    components: { KCircularLoader },
  };

</script>


<style lang="scss" scoped>

  .studio-large-loader {
    padding: 24px;
  }

</style>
