<template>

  <div class="editor-container">
    <EditorToolbar
      @insert-image="target => openCreateModal(null, target)"
      @insert-link="linkHandler.openLinkEditor()"
    />

    <!-- This div holds the bubble menu component and is passed to the editor -->
    <div ref="bubbleMenu">
      <LinkBubbleMenu
        v-if="isReady"
        :editor="editor"
      />
    </div>

    <!-- The Popover for creating/editing links -->
    <div
      v-if="linkHandler.isEditorOpen.value"
      :style="linkHandler.editorStyle.value"
    >
      <LinkEditor
        :initial-state="linkHandler.editorInitialState.value"
        @save="linkHandler.saveLink"
        @remove="linkHandler.removeLink"
        @close="linkHandler.closeLinkEditor"
      />
    </div>

    <div
      v-if="modalMode"
      class="image-upload-popover-wrapper"
      :class="{ 'has-overlay': isModalCentered }"
      @click.self="closeModal"
    >
      <ImageUploadModal
        :style="popoverStyle"
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

  import { defineComponent, provide, onMounted, ref } from 'vue';
  import EditorToolbar from './components/EditorToolbar.vue';
  import EditorContentWrapper from './components/EditorContentWrapper.vue';
  import { useEditor } from './composables/useEditor';
  import ImageUploadModal from './components/image/ImageUploadModal.vue';
  import { useImageHandling } from './composables/useImageHandling';
  import '../assets/styles/code-theme-dark.css';
  import { useLinkHandling } from './composables/useLinkHandling';
  import LinkBubbleMenu from './components/link/LinkBubbleMenu.vue';
  import LinkEditor from './components/link/LinkEditor.vue';

  export default defineComponent({
    name: 'RichTextEditor',
    components: {
      EditorToolbar,
      EditorContentWrapper,
      ImageUploadModal,
      LinkBubbleMenu,
      LinkEditor,
    },
    setup() {
      const { editor, isReady, initializeEditor } = useEditor();
      provide('editor', editor);
      provide('isReady', isReady);
      const bubbleMenu = ref(null);

      onMounted(() => {
        if (bubbleMenu.value) {
          initializeEditor(bubbleMenu.value, linkHandler.isEditorOpen);
        }
      });

      const {
        modalMode,
        modalInitialData,
        popoverStyle,
        isModalCentered,
        openCreateModal,
        closeModal,
        handleInsert,
        handleUpdate,
        handleRemove,
      } = useImageHandling(editor);

      const linkHandler = useLinkHandling(editor);
      provide('linkHandler', linkHandler);

      const handleDrop = event => {
        const file = event.dataTransfer?.files[0];
        if (file) {
          openCreateModal(file);
        }
      };

      return {
        isReady,
        modalMode,
        modalInitialData,
        popoverStyle,
        openCreateModal,
        closeModal,
        handleInsert,
        handleUpdate,
        handleRemove,
        handleDrop,
        isModalCentered,
        linkHandler,
        editor,
        bubbleMenu,
      };
    },
  });

</script>


<style scoped>

  .editor-container {
    position: relative;
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

  .image-upload-popover-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .image-upload-popover-wrapper > * {
    pointer-events: auto;
  }

  /* Overlay for edit mode to allow clicking outside to close */
  .image-upload-popover-wrapper.has-overlay {
    pointer-events: auto;
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

</style>
