<template>

  <div
    class="drop-zone"
    :class="{ 'is-dragging': isDragging }"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <slot></slot>
  </div>

</template>


<script>

  import { defineComponent, ref } from 'vue';

  export default defineComponent({
    name: 'ImageDropZone',
    emits: ['file-dropped'],
    setup(props, { emit }) {
      const isDragging = ref(false);

      const onDragOver = () => {
        isDragging.value = true;
      };

      const onDragLeave = () => {
        isDragging.value = false;
      };

      const onDrop = event => {
        isDragging.value = false;
        const file = event.dataTransfer?.files[0];
        if (file) {
          emit('file-dropped', file);
        }
      };

      return { isDragging, onDragOver, onDragLeave, onDrop };
    },
  });

</script>


<style scoped>

  .drop-zone {
    padding: 2rem;
    color: #757575;
    text-align: center;
    border: 1px dashed #bdbdbd;
    border-radius: 4px;
    transition:
      background-color 0.2s,
      border-color 0.2s;
  }

  .drop-zone.is-dragging {
    background-color: #ecf0f1;
    border-color: #3498db;
  }

</style>
