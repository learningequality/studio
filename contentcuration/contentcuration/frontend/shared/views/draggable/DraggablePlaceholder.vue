<template>

  <component
    :is="tag"
    class="draggable-placeholder"
  />

</template>


<script>

  export default {
    name: 'DraggablePlaceholder',
    inject: {
      draggableUniverse: { default: null },
      draggableRegionId: { default: null },
      draggableCollectionId: { default: null },
    },
    props: {
      tag: {
        type: String,
        default: 'div',
      },
    },
  };

</script>


<style lang="less" scoped>

</style>
