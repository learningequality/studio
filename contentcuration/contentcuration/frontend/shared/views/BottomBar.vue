<template>

  <div class="bottom-bar pa-2">
    <slot></slot>
  </div>

</template>
<script>

  export default {
    name: 'BottomBar',
    props: {
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      appearanceOverrides: {
        type: Object,
        default: () => ({ height: '64px' }),
      },
    },
  };

</script>
<style lang="less" scoped>

  .bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    z-index: 3;
    display: flex;
    width: 100%;
    height: v-bind('appearanceOverrides.height');
    background-color: #ffffff;
    border-top: 1px solid #dddddd;
  }

</style>
