<template>

  <div
    ref="modalRoot"
    class="image-upload-modal"
    role="dialog"
    aria-labelledby="modal-title"
    aria-describedby="modal-description"
  >
    <input
      ref="fileInput"
      type="file"
      :accept="ACCEPTED_MIME_TYPES.join(',')"
      style="display: none"
      aria-hidden="true"
      @change="onFileSelect"
    >
    <div class="modal-header">
      <h3 id="modal-title">{{ isEditMode ? editImage$() : uploadImage$() }}</h3>
      <button
        class="close-button"
        :aria-label="closeModal$()"
        @click="$emit('close')"
      >
        ×
      </button>
    </div>
    <div class="modal-content">
      <div
        v-if="modalState === 'loading'"
        class="loading-wrapper"
        aria-live="polite"
      >
        <div
          class="spinner"
          aria-hidden="true"
        ></div>
        <button
          class="cancel-button"
          :aria-label="cancelLoading$()"
          @click="resetToPreview"
        >
          {{ cancel$() }}
        </button>
      </div>
      <div
        v-else-if="modalState === 'preview' && previewSrc"
        class="preview-wrapper"
      >
        <div
          v-if="uploadWarning"
          class="upload-warning"
          role="alert"
        >
          {{ uploadWarning }}
        </div>
        <div class="file-info">
          <span>{{ fileName }}</span>
          <button
            class="select-file-link"
            :aria-label="isEditMode ? replaceFile$() : selectFile$()"
            @click="triggerFileInput"
          >
            {{ isEditMode ? replaceFile$() : selectFile$() }}
          </button>
        </div>
        <div class="image-preview-container">
          <img
            :src="previewSrc"
            :alt="imagePreview$()"
            class="image-preview"
          >
        </div>
        <div class="alt-text-container">
          <label for="alt-text-input">{{ altTextLabel$() }}</label>
          <input
            id="alt-text-input"
            v-model="altText"
            type="text"
            :placeholder="altTextPlaceholder$()"
            aria-describedby="alt-text-description"
          >
          <p
            id="alt-text-description"
            class="alt-text-description"
          >
            {{ altTextDescription$() }}
          </p>
        </div>
      </div>
      <div
        v-else
        id="modal-description"
      >
        <ImageDropZone
          @file-dropped="handleFileChange"
          @multiple-files-dropped="showMultiFileWarning"
        >
          <p class="drop-zone-text">{{ imageDropZoneText$() }}</p>
          <button
            class="select-file-button"
            type="button"
            :aria-label="selectFileToUpload$()"
            @click="triggerFileInput"
          >
            {{ selectFile$() }}
          </button>
          <p class="drop-zone-text">{{ supportedFileTypes$() }}</p>
        </ImageDropZone>
      </div>
    </div>
    <footer class="modal-footer">
      <template v-if="isEditMode">
        <button
          class="remove-button"
          :aria-label="removeImage$()"
          @click="$emit('remove')"
        >
          {{ remove$() }}
        </button>
        <button
          class="save-button"
          :aria-label="saveChanges$()"
          @click="onSave"
        >
          {{ save$() }}
        </button>
      </template>
      <template v-else>
        <button
          class="insert-button"
          :disabled="!canInsert"
          :aria-label="insertImage$()"
          @click="onInsert"
        >
          {{ insert$() }}
        </button>
      </template>
    </footer>
  </div>

</template>


<script>

  import { defineComponent, ref, computed, onMounted, inject, getCurrentInstance } from 'vue';
  import { useFocusTrap } from '../../composables/useFocusTrap';
  import { getTipTapEditorStrings } from '../../TipTapEditorStrings';
  import ImageDropZone from './ImageDropZone.vue';

  export default defineComponent({
    name: 'ImageUploadModal',
    components: { ImageDropZone },
    setup(props, { emit }) {
      const {
        editImage$,
        uploadImage$,
        closeModal$,
        cancelLoading$,
        cancel$,
        replaceFile$,
        selectFile$,
        imagePreview$,
        altTextLabel$,
        altTextPlaceholder$,
        altTextDescription$,
        imageDropZoneText$,
        selectFileToUpload$,
        supportedFileTypes$,
        removeImage$,
        remove$,
        saveChanges$,
        save$,
        insert$,
        insertImage$,
        defaultImageName$,
        multipleFilesDroppedWarning$,
      } = getTipTapEditorStrings();

      const modalRoot = ref(null);
      const modalState = ref('initial');
      const fileInput = ref(null);
      const originalData = ref(null);
      const previewSrc = ref('');
      const altText = ref('');
      const file = ref(null);
      const uploadWarning = ref('');
      let warningTimer = null;

      const isEditMode = computed(() => props.mode === 'edit');
      const fileName = computed(
        () => file.value?.name || (isEditMode.value ? defaultImageName$() : ''),
      );
      const canInsert = computed(() => !!previewSrc.value);

      // Inject the image processor service
      const imageProcessor = inject('imageProcessor', {});
      const { processFile, ACCEPTED_MIME_TYPES } = imageProcessor;

      const instance = getCurrentInstance();
      const store = instance.proxy.$store;

      onMounted(() => {
        originalData.value = { ...props.initialData };
        previewSrc.value = props.initialData.src || '';
        altText.value = props.initialData.alt || '';
        file.value = props.initialData.file || null;

        if (props.initialData.src) {
          modalState.value = 'preview';
        } else if (file.value) {
          handleFileChange(file.value);
        }
      });

      const showMultiFileWarning = () => {
        clearTimeout(warningTimer);
        uploadWarning.value = multipleFilesDroppedWarning$();
        warningTimer = setTimeout(() => {
          uploadWarning.value = '';
        }, 5000);
      };

      const handleFileChange = async selectedFile => {
        if (!selectedFile) return;
        modalState.value = 'loading';
        try {
          const { src, file: processedFile } = await processFile(selectedFile, { $store: store });
          previewSrc.value = src;
          file.value = processedFile;
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
      const onSave = () =>
        emit('update', {
          src: previewSrc.value,
          alt: altText.value,
          permanentSrc: previewSrc.value,
        });

      useFocusTrap(modalRoot);

      return {
        modalRoot,
        modalState,
        fileInput,
        previewSrc,
        altText,
        fileName,
        isEditMode,
        canInsert,
        ACCEPTED_MIME_TYPES,
        triggerFileInput,
        onFileSelect,
        onInsert,
        onSave,
        resetToPreview,
        handleFileChange,
        uploadWarning,
        showMultiFileWarning,

        // Strings
        editImage$,
        uploadImage$,
        closeModal$,
        cancelLoading$,
        cancel$,
        replaceFile$,
        selectFile$,
        imagePreview$,
        altTextLabel$,
        altTextPlaceholder$,
        altTextDescription$,
        imageDropZoneText$,
        selectFileToUpload$,
        supportedFileTypes$,
        removeImage$,
        remove$,
        saveChanges$,
        save$,
        insert$,
        insertImage$,
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

  /* Modal Container */
  .image-upload-modal {
    display: flex;
    flex-direction: column;
    width: 25rem;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  /* Modal Header */
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
    font-size: 2rem;
    line-height: 1;
    color: black;
    cursor: pointer;
    background: none;
    border: 0;
  }

  /* Modal Content */
  .modal-content {
    display: flex;
    flex-direction: column;
    min-height: 250px;
    padding: 1.5rem;
  }

  .upload-warning {
    padding: 0.75rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
    color: #d46b08;
    text-align: center;
    background-color: #fffbe6;
    border: 1px solid #ffe58f;
    border-radius: 4px;
  }

  /* Loading State */
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
    background: none;
    border: 0;
  }

  /* Preview State */
  .preview-wrapper {
    font-size: 0.875rem;
  }

  .file-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    word-break: break-word;
  }

  .select-file-link {
    flex-shrink: 0;
    margin-left: 1rem;
    color: #4368f5;
    text-decoration: underline;
    cursor: pointer;
    background: none;
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

  /* Alt Text Section */
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
    margin: 0.5rem 0;
    font-size: 0.75rem;
    color: #757575;
  }

  /* Modal Footer */
  .modal-footer {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    padding: 1rem;
    border-top: 1px solid #e0e0e0;
  }

  .insert-button,
  .save-button,
  .select-file-button {
    padding: 8px 16px;
    font-weight: 700;
    color: black;
    cursor: pointer;
    background: #e6e6e6;
    border: 1px solid #e0e0e0;
    border-radius: 2px;
  }

  .insert-button:disabled {
    color: #bdbdbd;
    cursor: not-allowed;
    background: #e0e0e0;
  }

  .remove-button {
    padding: 0.5rem 1rem;
    font-weight: 700;
    color: black;
    cursor: pointer;
    background: none;
    border: 0;
  }

  .select-file-button {
    margin: 1rem 0;
  }

  /* Drop Zone */
  .drop-zone-text {
    font-size: 12px;
  }

  button:focus-visible,
  input:focus {
    background: #e6e6e6;
    border-radius: 4px;
    outline: 2px solid #0097f2;
  }

</style>
