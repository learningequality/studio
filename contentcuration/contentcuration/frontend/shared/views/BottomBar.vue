<template>

  <div
    class="bottom-bar pa-2"
    :style="bottomBarStyles"
  >
    <slot></slot>
  </div>

</template>


<script>

  export default {
    name: 'BottomBar',
    props: {
      appearanceOverrides: {
        type: Object,
        default: () => ({}),
      },
    },
    computed: {
      bottomBarStyles() {
        return {
          backgroundColor: this.$themeTokens.surface,
          borderTop: `1px solid ${this.$themeTokens.fineLine}`,
          ...this.appearanceOverrides,
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  .bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    z-index: 3;
    display: flex;
    align-items: center;
    width: 100%;
    height: 64px;
  }

</style>
