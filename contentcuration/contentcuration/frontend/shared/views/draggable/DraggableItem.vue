<template>

  <component
    :is="tag"
    class="draggable-item"
    :class="{
      'in-draggable-universe': isInActiveDraggableUniverse,
      'dragging-over': isDraggingOver,
      'active-draggable': isActiveDraggable,
    }"
    :aria-dropeffect="dropEffect"
    v-on="$listeners"
  >
    <div class="placeholder">
      <slot name="placeholder" :style="placeholderTopStyle"></slot>
    </div>

    <DraggableHandle
      ref="handle"
      :draggableId="draggableId"
      @dropped="$emit('dropped', $event)"
      @dragstart="$emit('dragstart', $event)"
    >
      <slot></slot>
    </DraggableHandle>

    <div class="placeholder" :style="placeholderBottomStyle">
      <slot name="placeholder"></slot>
    </div>
  </component>

</template>

<script>

  import draggableItemMixin from 'shared/mixins/draggable/item';
  import DraggableHandle from 'shared/views/draggable/DraggableHandle';
  import DraggablePlaceholder from 'shared/views/draggable/DraggablePlaceholder';

  export default {
    name: 'DraggableItem',
    components: { DraggablePlaceholder, DraggableHandle },
    mixins: [draggableItemMixin],
    props: {
      tag: {
        type: String,
        default: 'div',
      },
    },
    computed: {
      placeholderTopStyle() {
        let height = '0px';

        if (this.isDraggingOverBottom && this.isDraggingUp) {
          height = this.getPlaceholderHeight();
        }

        return { height };
      },
      placeholderBottomStyle() {
        let height = '0px';

        if (this.isDraggingOverTop && this.isDraggingDown) {
          height = this.getPlaceholderHeight();
        }

        return { height };
      },
    },
    watch: {
      // isDraggingOver(v) {
      //   console.log('dragging over', this.draggableId, v);
      // },
      // isDraggingOverTop(v) {
      //   console.log('dragging over top', this.draggableId, v);
      // },
      // isDraggingOverBottom(v) {
      //   console.log('dragging over bottom', this.draggableId, v);
      // },
    },
    methods: {
      getPlaceholderHeight() {
        const height = this.$refs.handle.draggableHeight() || 0;
        return `${height}px`;
      },
    },
  };

</script>


<style lang="less" scoped>

  .draggable-item {
    position: relative;
    overflow: hidden;
  }

  .placeholder {
    width: 100%;
    height: 0;
    overflow: hidden;
    background: #cccccc;
    transition: height ease 0.2s;
  }

</style>
