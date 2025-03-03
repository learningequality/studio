<template>

  <VToolbar
    v-bind="$attrs"
    :flat="flat"
    :color="color"
  >
    <slot></slot>
    <template #extension>
      <slot name="extension"></slot>
    </template>
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
      flat: {
        type: Boolean,
        default: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  ::v-deep .v-toolbar__content {
    border-bottom: 1px solid transparent;

    .elevation-0 & {
      border-bottom-color: #eeeeee;
    }
  }

  .v-toolbar {
    box-shadow: 0 2px 3px rgba(113, 113, 113, 0.25);
  }

</style>
