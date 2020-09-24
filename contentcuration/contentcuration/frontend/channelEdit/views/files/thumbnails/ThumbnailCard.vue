<template>

  <VCard>
    <VLayout row wrap align-center justify-center style="max-height: 0px;">
      <div class="text-xs-center" style="position: absolute;">
        <slot></slot>
      </div>
    </VLayout>
  </VCard>

</template>

<script>

  export default {
    name: 'ThumbnailCard',
  };

</script>

<style scoped>

  .v-card {
    padding: 28% 0;
    box-shadow: none;
    border-style: solid;
    border-width: 1px;
    border-color: var(--v-greyBorder-base) !important;
  }

</style>
