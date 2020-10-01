<template>

  <VCard>
    <VLayout row wrap align-center justify-center style="max-height: 0px;">
      <div v-if="isMounted" class="text-xs-center" style="position: absolute;">
        <slot></slot>
      </div>
    </VLayout>
  </VCard>

</template>

<script>

  export default {
    name: 'ThumbnailCard',
    data() {
      return {
        // Need to delay showing the slot as position:absolute
        // will display incorrectly in RTL if the rest of the component
        // hasn't rendered yet
        isMounted: false,
      };
    },
    mounted() {
      this.$nextTick(() => {
        this.isMounted = true;
      });
    },
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
