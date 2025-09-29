<template>

  <div
    class="bottom-bar pa-2"
    :style="appearanceOverrides"
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
        default: () => {},
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
    background-color: #ffffff;
    border-top: 1px solid #dddddd;
  }

</style>
