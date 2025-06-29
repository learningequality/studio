<template>

  <div
    v-if="isReady"
    class="editor-container"
  >
    <EditorToolbar @insert-image="openCreateModal(null)" />

    <div
      v-if="modalMode"
      class="image-upload-modal-overlay"
    >
      <ImageUploadModal
        :mode="modalMode"
        :initial-data="modalInitialData"
        @close="closeModal"
        @insert="handleInsert"
        @update="handleUpdate"
        @remove="handleRemove"
      />
    </div>

    <EditorContentWrapper
      @drop.native.prevent="handleDrop"
      @dragover.native.prevent
    />
  </div>

</template>


<script>

  import { defineComponent, provide } from 'vue';
  import EditorToolbar from './components/EditorToolbar.vue';
  import EditorContentWrapper from './components/EditorContentWrapper.vue';
  import { useEditor } from './composables/useEditor';
  import ImageUploadModal from './components/image/ImageUploadModal.vue';
  import { useImageHandling } from './composables/useImageHandling';

  export default defineComponent({
    name: 'RichTextEditor',
    components: {
      EditorToolbar,
      EditorContentWrapper,
      ImageUploadModal,
    },
    setup() {
      const { editor, isReady } = useEditor();
      provide('editor', editor);
      provide('isReady', isReady);

      const {
        modalMode,
        modalInitialData,
        openCreateModal,
        closeModal,
        handleInsert,
        handleUpdate,
        handleRemove,
      } = useImageHandling(editor);

      // Allow dropping files directly onto the editor
      const handleDrop = event => {
        // console.log('File dropped:', event);
        const file = event.dataTransfer?.files[0];
        if (file) {
          openCreateModal(file);
        }
      };

      return {
        isReady,
        modalMode,
        modalInitialData,
        handleDrop,
        openCreateModal,
        closeModal,
        handleInsert,
        handleUpdate,
        handleRemove,
      };
    },
  });

</script>


<style scoped>

  .editor-container {
    width: 1000px;
    margin: 80px auto;
    font-family:
      'Noto Sans',
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      'Helvetica Neue',
      Arial,
      sans-serif;
    background: white;
    border: 1px solid #e1e5e9;
    border-radius: 8px;
  }

  .image-upload-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
  }

  .image-upload-modal-content {
    position: relative;
    padding: 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .close-modal {
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 1.5rem;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

</style>


<!-- Non-scoped styles for typography that apply to editor content -->
<style>

  .editor-container h1 {
    margin: 24px 0 16px;
    font-size: 32px;
    font-weight: 600;
  }

  .editor-container h2 {
    margin: 8px 0;
    font-size: 24px;
    font-weight: 600;
  }

  .editor-container h3 {
    margin: 8px 0;
    font-size: 18px;
    font-weight: 600;
  }

  .editor-container p {
    margin: 8px 0;
    font-size: 16px;
  }

  .editor-container small {
    margin: 4px 0;
    font-size: 12px;
  }

  .editor-container ul,
  .editor-container ol {
    padding-left: 20px;
    margin: 10px 0;
    margin-inline-start: 20px;
  }

  .editor-container li {
    margin: 4px 0;
  }

  .editor-container code {
    display: block;
    padding: 10px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 14px;
    color: #ffffff;
    white-space: pre-wrap;
    background: #000000;
    border-radius: 4px;
  }

  .editor-container .ProseMirror pre,
  .editor-container .ProseMirror code {
    -webkit-spellcheck: false;
    -ms-spellcheck: false;
  }

</style>
