<template>

  <div
    class="banner notranslate"
    :style="{ backgroundColor: error ? $themePalette.red.v_100 : '' }"
  >
    <slot>
    </slot>
  </div>

</template>


<script>

  export default {
    name: 'StudioBanner',
    props: {
      error: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .banner {
    padding: 16px;
  }

</style>
