<template>

  <component
    :is="tag"
    class="draggable-region"
    :class="{
      'in-draggable-universe': isInActiveDraggableUniverse,
      'dragging-over': isDraggingOver,
      'active-draggable': isActiveDraggable,
    }"
    :aria-dropeffect="dropEffect"
  >
    <slot></slot>
  </component>

</template>

<script>

  import draggableRegionMixin from 'shared/mixins/draggable/region';

  export default {
    name: 'DraggableRegion',
    mixins: [draggableRegionMixin],
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
