<template>

  <!-- Dragging placeholder -->
  <VCard
    v-if="draggingData"
    class="drag-placeholder"
    :style="{
      left: `${clientX + ($isRTL ? -488 : 8)}px`,
      top: `${clientY + 8}px`,
    }"
  >
    <slot v-bind="draggingData"></slot>
  </VCard>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';

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
      ...mapGetters('draggable', ['deepestActiveDraggable']),
      draggingData() {
        if (this.activeDraggableUniverse === this.draggableUniverse) {
          return this.deepestActiveDraggable;
        }
        return null;
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  .drag-placeholder {
    position: absolute;
    z-index: 24;
    transition: none !important;
  }

</style>
