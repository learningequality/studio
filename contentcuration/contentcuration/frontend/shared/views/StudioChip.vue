<template>

  <span
    class="studio-chip"
    :class="{ notranslate }"
    :style="chipStyle"
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
    computed: {
      chipStyle() {
        return {
          color: this.$themeTokens.text,
          backgroundColor: this.$themePalette.grey.v_200,
        };
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
    border-radius: 10px;
  }

</style>
