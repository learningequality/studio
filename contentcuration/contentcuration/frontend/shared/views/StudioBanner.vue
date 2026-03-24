<template>

  <div
    class="banner"
    data-testid="studio-banner"
    :style="{
      backgroundColor: error ? $themePalette.red.v_100 : '',
    }"
  >
    <KIcon
      v-if="error"
      class="icon"
      icon="error"
    />
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
    display: flex;
    gap: 16px;
    padding: 12px 16px;
  }

  .icon {
    position: relative;
    top: -1px;
    flex-shrink: 0;
    font-size: 18px;
  }

</style>
