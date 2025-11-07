<template>

  <span
    class="studio-chip"
    :class="{ notranslate }"
  >
    <slot></slot>
  </span>

</template>


<script>

  /**
   * StudioChip displays small rounded badges/tags for metadata like levels, categories, and tags.
   * This component replaces Vuetify's VChip with a KDS-inspired design.
   *
   * Usage:
   * <StudioChip>My Tag</StudioChip>
   * <StudioChip :notranslate="true">User Generated Content</StudioChip>
   */
  export default {
    name: 'StudioChip',
    props: {
      /**
       * Whether the chip content should not be translated by browser translation
       */
      notranslate: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .studio-chip {
    display: inline-block;
    padding: 4px 8px;
    margin: 2px 4px 2px 0;
    font-size: 12px;
    font-weight: bold;
    line-height: 16px;
    color: var(--v-text-base, #000000);
    background-color: var(--v-grey-lighten3, #e0e0e0);
    border-radius: 10px;
  }

</style>
