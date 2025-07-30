<template>

  <div class="editor-container">
    <EditorToolbar
      v-if="!isMobile"
      @insert-image="target => imageHandler.openCreateModal({ targetElement: target })"
      @insert-link="linkHandler.openLinkEditor()"
      @insert-math="target => mathHandler.openCreateMathModal({ targetElement: target })"
    />

    <div v-else>
      <MobileTopBar
        @insert-image="target => imageHandler.openCreateModal({ targetElement: target })"
        @insert-link="linkHandler.openLinkEditor()"
        @insert-math="target => mathHandler.openCreateMathModal({ targetElement: target })"
      />
      <MobileFormattingBar v-if="isFocused" />
    </div>

    <div
      v-if="linkHandler.isBubbleMenuOpen.value"
      :style="linkHandler.popoverStyle.value"
    >
      <LinkBubbleMenu
        v-if="isReady"
        :editor="editor"
      />
    </div>

    <div
      v-if="linkHandler.isEditorOpen.value"
      class="link-editor-popover-wrapper"
      :class="{ 'has-overlay': linkHandler.isEditorCentered.value }"
      :style="linkHandler.isEditorCentered.value ? {} : linkHandler.popoverStyle.value"
      @click.self="linkHandler.closeLinkEditor"
    >
      <LinkEditor
        :style="linkHandler.isEditorCentered.value ? linkHandler.popoverStyle.value : {}"
        :mode="linkHandler.editorMode.value"
        :initial-state="linkHandler.editorInitialState.value"
        @save="linkHandler.saveLink"
        @remove="linkHandler.removeLink"
        @close="linkHandler.closeLinkEditor"
      />
    </div>

    <div
      v-if="imageHandler.modalMode.value"
      class="image-upload-popover-wrapper"
      :class="{ 'has-overlay': imageHandler.isModalCentered.value }"
      @click.self="imageHandler.closeModal"
    >
      <ImageUploadModal
        :style="imageHandler.popoverStyle.value"
        :mode="imageHandler.modalMode.value"
        :initial-data="imageHandler.modalInitialData.value"
        @close="imageHandler.closeModal"
        @insert="imageHandler.handleInsert"
        @update="imageHandler.handleUpdate"
        @remove="imageHandler.handleRemove"
      />
    </div>

    <div
      v-if="mathHandler.isMathModalOpen.value"
      class="math-modal-popover-wrapper"
      :class="{ 'has-overlay': mathHandler.isModalCentered.value }"
      @click.self="mathHandler.closeMathModal()"
    >
      <FormulasMenu
        :style="mathHandler.popoverStyle.value"
        :mode="mathHandler.mathModalMode.value"
        :initial-latex="mathHandler.mathModalInitialLatex.value"
        @save="mathHandler.handleSaveMath"
        @close="mathHandler.closeMathModal"
      />
    </div>

    <EditorContentWrapper
      @drop.native.prevent="handleDrop"
      @dragover.native.prevent
    />
  </div>

</template>


<script>

  import { defineComponent, provide, watch, nextTick } from 'vue';
  import EditorToolbar from './components/EditorToolbar.vue';
  import EditorContentWrapper from './components/EditorContentWrapper.vue';
  import { useEditor } from './composables/useEditor';
  import ImageUploadModal from './components/image/ImageUploadModal.vue';
  import { useImageHandling } from './composables/useImageHandling';
  import '../assets/styles/code-theme-dark.css';
  import { useLinkHandling } from './composables/useLinkHandling';
  import LinkBubbleMenu from './components/link/LinkBubbleMenu.vue';
  import LinkEditor from './components/link/LinkEditor.vue';
  import { useMathHandling } from './composables/useMathHandling';
  import FormulasMenu from './components/math/FormulasMenu.vue';
  import { preprocessMarkdown } from './utils/markdown';
  import MobileTopBar from './components/toolbar/MobileTopBar.vue';
  import MobileFormattingBar from './components/toolbar/MobileFormattingBar.vue';
  import { useBreakpoint } from './composables/useBreakpoint';

  export default defineComponent({
    name: 'RichTextEditor',
    components: {
      EditorToolbar,
      EditorContentWrapper,
      ImageUploadModal,
      LinkBubbleMenu,
      LinkEditor,
      FormulasMenu,
      MobileTopBar,
      MobileFormattingBar,
    },
    setup(props, { emit }) {
      const { editor, isReady, isFocused, initializeEditor } = useEditor();
      provide('editor', editor);
      provide('isReady', isReady);

      const linkHandler = useLinkHandling(editor);
      provide('linkHandler', linkHandler);

      const mathHandler = useMathHandling(editor);
      provide('mathHandler', mathHandler);

      const { isMobile } = useBreakpoint();

      const imageHandler = useImageHandling(editor);

      const handleDrop = event => {
        const file = event.dataTransfer.files[0];
        if (file) {
          imageHandler.openCreateModal({ file });
        }
      };

      const getMarkdownContent = () => {
        if (!editor.value || !isReady.value || !editor.value.storage?.markdown) {
          return '';
        }
        return editor.value.storage.markdown.getMarkdown();
      };

      let isUpdatingFromOutside = false; // A flag to prevent infinite update loops

      // sync changes from the parent component to the editor
      watch(
        () => props.value,
        newValue => {
          const processedContent = preprocessMarkdown(newValue);

          if (!editor.value) {
            initializeEditor(processedContent);
            return;
          }

          const editorContent = getMarkdownContent();
          if (editorContent !== newValue) {
            isUpdatingFromOutside = true;
            editor.value.commands.setContent(processedContent, false);
            nextTick(() => {
              isUpdatingFromOutside = false;
            });
          }
        },
        { immediate: true },
      );

      // sync changes from the editor to the parent component
      watch(
        () => editor.value?.state,
        () => {
          if (
            !editor.value ||
            !isReady.value ||
            isUpdatingFromOutside ||
            !editor.value.storage?.markdown
          ) {
            return;
          }

          const markdown = getMarkdownContent();
          if (markdown !== props.value) {
            emit('input', markdown);
          }
        },
        { deep: true },
      );

      return {
        isReady,
        isFocused,
        handleDrop,
        linkHandler,
        editor,
        mathHandler,
        isMobile,
        imageHandler,
      };
    },
    props: {
      value: {
        type: String,
        default: '',
      },
    },
    emits: ['input'],
  });

</script>


<style scoped>

  .editor-container {
    position: relative;
    min-width: 200px;
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

  .link-editor-popover-wrapper,
  .image-upload-popover-wrapper,
  .math-modal-popover-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .link-editor-popover-wrapper > *,
  .image-upload-popover-wrapper > *,
  .math-modal-popover-wrapper > * {
    pointer-events: auto;
  }

  /* Overlay for edit mode to allow clicking outside to close */
  .has-overlay {
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
