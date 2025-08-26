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
    emits: ['file-dropped', 'multiple-files-dropped'],
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
        const files = event.dataTransfer?.files;

        if (!files || files.length === 0) {
          return;
        }

        if (files.length > 1) {
          emit('multiple-files-dropped');
        }

        const file = files[0];
        if (file) {
          emit('file-dropped', file);
        }
      };

      return {
        isDragging,
        onDragOver,
        onDragLeave,
        onDrop,
      };
    },
  });

</script>


<style scoped>

  .drop-zone {
    padding: 2rem;
    color: #757575;
    text-align: center;
    cursor: pointer;
    border: 1px solid #bdbdbd;
    transition:
      background-color 0.2s,
      border-color 0.2s;
  }

  .drop-zone.is-dragging {
    background-color: #ecf0f1;
    border-color: #3498db;
  }

  .drop-zone:focus {
    background: #e6e6e6;
    border-radius: 4px;
    outline: 2px solid #0097f2;
  }

</style>
