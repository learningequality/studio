<template>

  <VToolbar v-bind="$attrs" style="top: unset; bottom: 0em;" fixed>
    <slot></slot>
  </VToolbar>

</template>


<script>

  export default {
    name: 'BottomToolBar',
  };

</script>

<style lang="less" scoped>

  /deep/ .v-toolbar__content {
    border-top: 1px solid #eeeeee;
  }

</style>
