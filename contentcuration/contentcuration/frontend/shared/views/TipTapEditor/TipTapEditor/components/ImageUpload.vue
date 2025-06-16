<template>
  <div class="image-upload-modal">
    <!-- Hidden file input that's always available -->
    <input
      type="file"
      ref="fileInput"
      @change="onFileSelect"
      accept="image/png, image/jpeg, image/gif, image/svg+xml, image/webp"
      style="display: none"
    />
    
    <!-- 1. Header -->
    <div class="modal-header">
      <h3>Upload image</h3>
      <button class="close-button" @click="$emit('close')">×</button>
    </div>

    <!-- 2. Main Content (changes based on state) -->
    <div class="modal-content">
      <!-- Initial State: Drop Zone -->
      <div v-if="modalState === 'initial'" class="drop-zone-wrapper">
        <div class="drop-zone" @dragover.prevent @drop.prevent="onDrop">
          <p>Drag and drop an image here or upload manually</p>
          <button class="select-file-button" type="button" @click="triggerFileInput">
            Select File
          </button>
          <p class="supported-files">Supported file types: png, jpg, jpeg, svg</p>
        </div>
      </div>

      <!-- Loading State: Spinner -->
      <div v-else-if="modalState === 'loading'" class="loading-wrapper">
        <div class="spinner"></div>
        <button class="cancel-button" @click="resetState">Cancel</button>
      </div>

      <!-- Preview State -->
      <div v-else-if="modalState === 'preview'" class="preview-wrapper">
        <div class="file-info">
          <span>{{ fileName }}</span>
          <button class="select-file-link" @click="triggerFileInput">Select file</button>
        </div>
        <div class="image-preview-container">
          <img :src="previewSrc" alt="Image preview" class="image-preview" />
        </div>
        <div class="alt-text-container">
          <label for="alt-text-input">Alt text (Optional)</label>
          <input
            id="alt-text-input"
            type="text"
            v-model="altText"
            placeholder="Describe the image..."
          />
          <p class="alt-text-description">
            Alt text is necessary to enable visually impaired learners to answer questions...
          </p>
        </div>
      </div>
    </div>

    <!-- 3. Footer -->
    <div class="modal-footer">
      <button class="insert-button" :disabled="!canInsert" @click="onInsert">
        Insert
      </button>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from 'vue';
import { readFileAsDataURL } from '../utils/image';

export default defineComponent({
  name: 'ImageUpload',
  props: {
    // Used for drag-and-drop from the main editor
    initialFile: {
      type: File,
      default: null,
    },
  },
  emits: ['close', 'insert-image'],
  setup(props, { emit }) {
    const modalState = ref('initial'); // 'initial', 'loading', 'preview'
    const fileInput = ref(null);

    // Data for the preview state
    const file = ref(null);
    const previewSrc = ref('');
    const altText = ref('');

    const fileName = computed(() => file.value?.name || '');
    const canInsert = computed(() => modalState.value === 'preview' && file.value);

    const processFile = async (selectedFile) => {
      if (!selectedFile || !selectedFile.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }
      modalState.value = 'loading';
      try {
        const dataUrl = await readFileAsDataURL(selectedFile);
        file.value = selectedFile;
        previewSrc.value = dataUrl;
        altText.value = selectedFile.name.split('.').slice(0, -1).join('.'); // Use filename as default alt text
        modalState.value = 'preview';
      } catch (error) {
        console.error('File reading failed:', error);
        alert('Could not read the selected file.');
        resetState();
      }
    };

    const triggerFileInput = () => {
      fileInput.value.click();
    };

    const onFileSelect = (event) => {
      const selectedFile = event.target.files[0];
      processFile(selectedFile);
    };

    const onDrop = (event) => {
      const selectedFile = event.dataTransfer.files[0];
      processFile(selectedFile);
    };

    const onInsert = () => {
      if (canInsert.value) {
        emit('insert-image', {
          src: previewSrc.value,
          alt: altText.value,
        });
        emit('close');
      }
    };

    const resetState = () => {
      modalState.value = 'initial';
      file.value = null;
      previewSrc.value = '';
      altText.value = '';
    };

    // Handle drag-and-drop from the editor
    onMounted(() => {
      if (props.initialFile) {
        processFile(props.initialFile);
      }
    });

    return {
      modalState,
      fileInput,
      fileName,
      previewSrc,
      altText,
      canInsert,
      triggerFileInput,
      onFileSelect,
      onDrop,
      onInsert,
      resetState,
    };
  },
});
</script>

<style scoped>
/* Scoped styles to match the Figma design */
.image-upload-modal {
  background: white;
  width: 400px;
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
}
.modal-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: bold;
}
.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #757575;
}
.modal-content {
  padding: 1.5rem;
  min-height: 250px;
  display: flex;
  flex-direction: column;
}
.drop-zone {
  border: 1px dashed #bdbdbd;
  border-radius: 4px;
  padding: 2rem;
  text-align: center;
  color: #757575;
}
.select-file-button {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  margin: 1rem 0;
}
.supported-files {
  font-size: 0.75rem;
  color: #757575;
}
.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
}
.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.cancel-button {
  background: none;
  border: none;
  color: #3498db;
  cursor: pointer;
  margin-top: 1rem;
}
.preview-wrapper {
  font-size: 0.875rem;
}
.file-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.select-file-link {
  background: none;
  border: none;
  color: #3498db;
  cursor: pointer;
  font-weight: bold;
}
.image-preview-container {
  background-color: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}
.image-preview {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.alt-text-container label {
  font-weight: bold;
  display: block;
  margin-bottom: 0.5rem;
}
.alt-text-container input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  box-sizing: border-box;
}
.alt-text-description {
  font-size: 0.75rem;
  color: #757575;
  margin-top: 0.5rem;
}
.modal-footer {
  padding: 1rem;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
}
.insert-button {
  background: #00796b;
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}
.insert-button:disabled {
  background: #e0e0e0;
  cursor: not-allowed;
}
</style>