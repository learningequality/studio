<template>

  <!-- Dragging placeholder -->
  <VCard
    v-if="draggingData"
    class="drag-placeholder"
    :style="{
      left: `${clientX + ($isRTL? -488 : 8)}px`,
      top: `${clientY + 8}px`,
    }"
  >
    <slot :metadata="draggingData"></slot>
  </VCard>

</template>


<script>

  import { mapState } from 'vuex';

  export default {
    name: 'DraggablePlaceholder',
    props: {
      draggableUniverse: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapState('draggable', ['activeDraggableUniverse', 'clientX', 'clientY']),
      ...mapState('draggable/handles', ['activeDraggable']),
      draggingData() {
        if (this.activeDraggableUniverse === this.draggableUniverse) {
          // TODO: return metadata prop set on drag state directly
          return this.activeDraggable;
        }
        return null;
      },
    },
    $trs: {},
  };

</script>


<style lang="less" scoped>

  .drag-placeholder {
    position: absolute;
    z-index: 24;
  }

</style>
