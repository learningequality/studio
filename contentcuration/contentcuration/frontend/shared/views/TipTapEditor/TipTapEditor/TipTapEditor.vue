<template>
  <div class="editor-container" v-if="isReady">
    <EditorToolbar
      @insert-image="showImageUpload = true" 
    /> 

    <div v-if="showImageUpload" class="image-upload-modal-overlay">
      <!-- Pass the dropped file as a prop. Listen for new events. -->
      <ImageUpload
        :initial-file="droppedFile"
        @close="onModalClose"
        @insert-image="onInsertImage"
      />
    </div>

    <EditorContentWrapper
      @drop.native.prevent="handleDrop"
      @dragover.native.prevent
    />
  </div>
</template>


<script>

  import { defineComponent, provide, ref } from 'vue';
  import EditorToolbar from './components/EditorToolbar.vue';
  import EditorContentWrapper from './components/EditorContentWrapper.vue';
  import { useEditor } from './composables/useEditor';
  import ImageUpload from './components/ImageUpload.vue';

  export default defineComponent({
    name: 'RichTextEditor',
    components: {
      EditorToolbar,
      EditorContentWrapper,
      ImageUpload,
    },
  setup() {
    const { editor, isReady} = useEditor();
    provide('editor', editor);
    provide('isReady', isReady);

     const showImageUpload = ref(false);
    const droppedFile = ref(null); // To handle drag-and-drop

    // This is the new function that inserts the image into the editor
    const onInsertImage = ({ src, alt }) => {
      if (!src) return;

      const img = new window.Image();
      img.src = src;
      img.onload = () => {
        editor.value
          .chain()
          .focus()
          .setImage({
            src,
            alt,
            width: Math.min(img.width, 600),
          })
          .run();
      };
    };

    const handleDrop = (event) => {
      const file = event.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        // Instead of processing, store the file and open the modal
        droppedFile.value = file;
        showImageUpload.value = true;
      }
    };

    const onModalClose = () => {
      showImageUpload.value = false;
      droppedFile.value = null; // Reset the dropped file on close
    };

    return {
      editor,
      isReady,
      showImageUpload,
      droppedFile,
      handleDrop,
      onInsertImage,
      onModalClose,
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
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.image-upload-modal-content {
  position: relative;
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.close-modal {
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
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
