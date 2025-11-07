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

  export default {
    name: 'StudioChip',
    props: {
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
