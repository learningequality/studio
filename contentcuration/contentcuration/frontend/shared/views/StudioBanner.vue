<template>

  <div
    class="banner"
    data-testid="studio-banner"
    :style="{
      backgroundColor: error ? $themePalette.red.v_100 : '',
      color: error ? $themeTokens.error : '',
    }"
  >
    <slot>
      {{ text }}
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
