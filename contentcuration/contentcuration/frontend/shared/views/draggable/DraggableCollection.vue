<template>

  <component
    :is="tag"
    class="draggable-collection"
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

  import draggableCollectionMixin from 'shared/mixins/draggable/collection';

  export default {
    name: 'DraggableCollection',
    mixins: [draggableCollectionMixin],
    props: {
      tag: {
        type: String,
        default: 'ol',
      },
    },
  };

</script>

<style lang="less" scoped>
</style>
