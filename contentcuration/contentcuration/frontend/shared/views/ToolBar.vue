<template>

  <VToolbar v-bind="$attrs">
    <slot></slot>
  </VToolbar>

</template>


<script>

  export default {
    name: 'ToolBar',
  };

</script>

<style lang="less" scoped>

  /deep/ .v-toolbar__content {
    border-bottom: 1px solid #eeeeee;
  }

</style>
