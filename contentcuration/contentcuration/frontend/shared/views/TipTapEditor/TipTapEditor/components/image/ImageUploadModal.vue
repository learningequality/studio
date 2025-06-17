<template>

  <div class="image-upload-modal">
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="onFileSelect"
    >
    <div class="modal-header">
      <h3>{{ isEditMode ? 'Edit image' : 'Upload image' }}</h3>
      <button
        class="close-button"
        @click="$emit('close')"
      >
        ×
      </button>
    </div>
    <div class="modal-content">
      <div
        v-if="modalState === 'loading'"
        class="loading-wrapper"
      >
        <div class="spinner"></div>
        <button
          class="cancel-button"
          @click="resetToPreview"
        >
          Cancel
        </button>
      </div>
      <div
        v-else-if="modalState === 'initial'"
        class="drop-zone-wrapper"
      >
        <ImageDropZone @file-dropped="handleFileChange">
          <p>Drag and drop an image here or upload manually</p>
          <button
            class="select-file-button"
            type="button"
            @click="triggerFileInput"
          >
            Select File
          </button>
          <p class="supported-files">Supported file types: png, jpg, jpeg, svg</p>
        </ImageDropZone>
      </div>
      <div
        v-else-if="modalState === 'preview'"
        class="preview-wrapper"
      >
        <div class="file-info">
          <span>{{ fileName }}</span>
          <button
            class="select-file-link"
            @click="triggerFileInput"
          >
            {{ isEditMode ? 'Replace file' : 'Select file' }}
          </button>
        </div>
        <div class="image-preview-container">
          <img
            :src="previewSrc"
            alt="Image preview"
            class="image-preview"
          >
        </div>
        <div class="alt-text-container">
          <label for="alt-text-input">Alt text (Optional)</label>
          <input
            id="alt-text-input"
            v-model="altText"
            type="text"
            placeholder="Describe the image..."
          >
          <p class="alt-text-description">
            Alt text is necessary to enable visually impaired learners...
          </p>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <template v-if="isEditMode">
        <button
          class="remove-button"
          @click="$emit('remove')"
        >
          Remove
        </button>
        <button
          class="save-button"
          @click="onSave"
        >
          Save
        </button>
      </template>
      <template v-else>
        <button
          class="insert-button"
          :disabled="!canInsert"
          @click="onInsert"
        >
          Insert
        </button>
      </template>
    </div>
  </div>

</template>


<script>

  import { defineComponent, ref, computed, onMounted } from 'vue';
  import { processFile } from '../../services/imageService';
  import ImageDropZone from './ImageDropZone.vue';

  export default defineComponent({
    name: 'ImageUploadModal',
    components: { ImageDropZone },
    setup(props, { emit }) {
      const modalState = ref('preview');
      const fileInput = ref(null);
      const originalData = ref(null);
      const previewSrc = ref('');
      const altText = ref('');
      const file = ref(null);

      const isEditMode = computed(() => props.mode === 'edit');
      const fileName = computed(() => file.value?.name || (isEditMode.value ? 'Image' : ''));
      const canInsert = computed(() => !!previewSrc.value);

      onMounted(() => {
        originalData.value = { ...props.initialData };
        previewSrc.value = props.initialData.src || '';
        altText.value = props.initialData.alt || '';
        file.value = props.initialData.file || null;

        if (props.mode === 'create' && !file.value) {
          modalState.value = 'initial';
        } else if (file.value) {
          handleFileChange(file.value);
        }
      });

      const handleFileChange = async selectedFile => {
        if (!selectedFile) return;
        modalState.value = 'loading';
        try {
          const { src, file: processedFile } = await processFile(selectedFile);
          previewSrc.value = src;
          file.value = processedFile;
          if (!altText.value) {
            altText.value = processedFile.name.split('.').slice(0, -1).join('.');
          }
          modalState.value = 'preview';
        } catch (error) {
          alert(error.message);
          resetToPreview();
        }
      };

      const resetToPreview = () => {
        if (props.mode === 'create' && !originalData.value.file) {
          modalState.value = 'initial';
          previewSrc.value = '';
          altText.value = '';
          file.value = null;
        } else {
          modalState.value = 'preview';
          previewSrc.value = originalData.value.src;
          altText.value = originalData.value.alt;
          file.value = originalData.value.file;
        }
      };

      const triggerFileInput = () => fileInput.value.click();
      const onFileSelect = event => handleFileChange(event.target.files[0]);
      const onInsert = () => emit('insert', { src: previewSrc.value, alt: altText.value });
      const onSave = () => emit('update', { src: previewSrc.value, alt: altText.value });

      return {
        modalState,
        fileInput,
        previewSrc,
        altText,
        fileName,
        isEditMode,
        canInsert,
        triggerFileInput,
        onFileSelect,
        onInsert,
        onSave,
        resetToPreview,
        handleFileChange,
      };
    },
    props: {
      mode: { type: String, default: 'create' },
      initialData: { type: Object, default: () => ({}) },
    },
    emits: ['close', 'insert', 'update', 'remove'],
  });

</script>


<style scoped>

  .image-upload-modal {
    display: flex;
    flex-direction: column;
    width: 400px;
    background: white;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
  }

  .close-button {
    font-size: 1.5rem;
    color: #757575;
    cursor: pointer;
    background: 0 0;
    border: 0;
  }

  .modal-content {
    display: flex;
    flex-direction: column;
    min-height: 250px;
    padding: 1.5rem;
  }

  .loading-wrapper {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    align-items: center;
    justify-content: center;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% {
      transform: rotate(0);
    }

    100% {
      transform: rotate(360deg);
    }
  }

  .cancel-button {
    margin-top: 1rem;
    color: #3498db;
    cursor: pointer;
    background: 0 0;
    border: 0;
  }

  .preview-wrapper {
    font-size: 0.875rem;
  }

  .file-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    word-break: break-all;
  }

  .select-file-link {
    flex-shrink: 0;
    margin-left: 1rem;
    font-weight: 700;
    color: #3498db;
    cursor: pointer;
    background: 0 0;
    border: 0;
  }

  .image-preview-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 150px;
    margin-bottom: 1rem;
    background-color: #fafafa;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
  }

  .image-preview {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .alt-text-container label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 700;
  }

  .alt-text-container input {
    box-sizing: border-box;
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #bdbdbd;
    border-radius: 4px;
  }

  .alt-text-description {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #757575;
  }

  .modal-footer {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    padding: 1rem;
    border-top: 1px solid #e0e0e0;
  }

  .insert-button,
  .save-button {
    padding: 0.5rem 1.5rem;
    font-weight: 700;
    color: #ffffff;
    cursor: pointer;
    background: #00796b;
    border: 0;
    border-radius: 4px;
  }

  .insert-button:disabled,
  .save-button:disabled {
    cursor: not-allowed;
    background: #e0e0e0;
  }

  .remove-button {
    padding: 0.5rem 1rem;
    font-weight: 700;
    color: #d32f2f;
    cursor: pointer;
    background: 0 0;
    border: 1px solid #d32f2f;
    border-radius: 4px;
  }

  .select-file-button {
    padding: 0.5rem 1rem;
    margin: 1rem 0;
    font-weight: 700;
    cursor: pointer;
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
  }

  .supported-files {
    font-size: 0.75rem;
    color: #757575;
  }

</style>
