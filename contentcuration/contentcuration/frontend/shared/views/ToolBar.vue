<template>

  <VToolbar v-bind="$attrs" flat :color="color">
    <slot></slot>
  </VToolbar>

</template>


<script>

  export default {
    name: 'ToolBar',
    props: {
      color: {
        type: String,
        default: 'transparent',
      },
    },
  };

</script>

<style lang="less" scoped>

  /deep/ .v-toolbar__content {
    border-bottom: 1px solid #eeeeee;
  }

</style>
