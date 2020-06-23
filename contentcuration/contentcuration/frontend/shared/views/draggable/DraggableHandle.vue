<template>

  <component
    :is="tag"
    class="draggable-handle"
    :draggable="(draggable || false).toString()"
    :aria-grabbed="(isDragging || false).toString()"
  >
    <slot></slot>
  </component>

</template>

<script>

  import draggableHandleMixin from 'shared/mixins/draggable/handle';

  export default {
    name: 'DraggableHandle',
    mixins: [draggableHandleMixin],
    props: {
      tag: {
        type: String,
        default: 'div',
      },
    },
    methods: {
      /**
       * @public
       * @return {number}
       */
      draggableHeight() {
        return this.$el.offsetHeight;
      },
    },
  };

</script>


<style lang="less" scoped>
</style>
