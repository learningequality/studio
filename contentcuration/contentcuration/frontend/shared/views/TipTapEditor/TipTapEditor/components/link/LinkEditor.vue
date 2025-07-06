<template>

  <div
    ref="rootEl"
    class="link-editor-popover"
    role="dialog"
    :aria-labelledby="headingId"
    aria-modal="true"
  >
    <div class="modal-header">
      <h3 :id="headingId">{{ isEditMode ? editLink$() : addLink$() }}</h3>
      <button
        class="close-button"
        :title="close$()"
        :aria-label="closeModal$()"
        @click="$emit('close')"
      >
        ×
      </button>
    </div>

    <div class="content">
      <div class="form-group">
        <label for="link-text">{{ text$() }}</label>
        <input
          id="link-text"
          v-model="formData.text"
          type="text"
          required
        >
      </div>
      <div class="form-group">
        <label for="link-href">{{ link$() }}</label>
        <input
          id="link-href"
          v-model="formData.href"
          type="url"
          :placeholder="link$()"
          required
        >
      </div>
    </div>

    <div
      class="footer"
      :class="{ 'edit-mode': isEditMode }"
    >
      <button
        v-if="isEditMode"
        class="remove-link-button"
        @click="$emit('remove')"
      >
        <img
          src="../../../assets/icon-linkOff.svg"
          aria-hidden="true"
          class="remove-link-icon"
        >
        <span> {{ removeLink$() }} </span>
      </button>

      <button
        class="save-button"
        :disabled="!validateForm()"
        @click="onSave"
      >
        {{ save$() }}
      </button>
    </div>
  </div>

</template>


<script>

  import { defineComponent, ref, watch, computed } from 'vue';
  import { useFocusTrap } from '../../composables/useFocusTrap';
  import { getTipTapEditorStrings } from '../../TipTapEditorStrings';

  export default defineComponent({
    name: 'LinkEditor',
    setup(props, { emit }) {
      const { addLink$, close$, text$, link$, save$, closeModal$, editLink$, removeLink$ } =
        getTipTapEditorStrings();
      const rootEl = ref(null);
      const formData = ref({ text: '', href: '' });
      const headingId = `link-editor-heading-${Math.random().toString(36).substr(2, 9)}`;

      const isEditMode = computed(() => props.mode === 'edit');

      watch(
        () => props.initialState,
        newState => {
          formData.value = { ...newState };
        },
        { immediate: true, deep: true },
      );

      useFocusTrap(rootEl);

      const onSave = () => {
        emit('save', formData.value);
      };

      const validateForm = () => {
        return formData.value.text.trim() !== '' && formData.value.href.trim() !== '';
      };

      return {
        rootEl,
        formData,
        onSave,
        validateForm,
        isEditMode,
        headingId,
        addLink$,
        close$,
        text$,
        link$,
        save$,
        closeModal$,
        editLink$,
        removeLink$,
      };
    },
    props: {
      mode: { type: String, default: 'create' },
      initialState: { type: Object, required: true },
    },
    emits: ['save', 'remove', 'close'],
  });

</script>


<style scoped>

  .link-editor-popover {
    display: flex;
    flex-direction: column;
    width: 539px;
    padding: 16px;
    font-family:
      'Noto Sans',
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      sans-serif;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
    padding-bottom: 12px;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: bold;
  }

  .close-button {
    font-size: 2rem;
    line-height: 1;
    color: black;
    cursor: pointer;
    background: none;
    border: 0;
  }

  .form-group {
    position: relative;
    display: flex;
    flex-direction: column;
    margin-bottom: 16px;
  }

  .form-group label {
    position: absolute;
    top: 4px;
    left: 12px;
    font-size: 0.625rem;
    color: #757575;
  }

  .form-group input {
    box-sizing: border-box;
    width: 100%;
    min-height: 50px;
    padding: 7px 7px 0;
    font-size: 0.875rem;
    background-color: #f5f5f5;
    border-bottom: 1px solid black;
  }

  .form-group input:focus {
    border-bottom: 0;
    outline: 2px solid #0097f2;
    outline-offset: 1px;
  }

  .footer {
    display: flex;
    justify-content: flex-end;
  }

  .footer.edit-mode {
    justify-content: space-between;
  }

  .save-button {
    padding: 8px 16px;
    font-weight: bold;
    color: black;
    cursor: pointer;
    background-color: #f5f5f5;
    border: 0;
    border-radius: 2px;
  }

  .save-button:disabled {
    color: #bdbdbd;
    cursor: not-allowed;
  }

  .remove-link-button {
    display: flex;
    gap: 8px;
    align-items: center;
    color: #4368f5;
    text-decoration: underline;
    cursor: pointer;
    background: none;
    border: 0;
    border-radius: 2px;
  }

  .remove-link-icon {
    filter: brightness(0) saturate(100%) invert(32%) sepia(97%) saturate(2640%) hue-rotate(230deg)
      brightness(103%) contrast(94%);
  }

  button:focus-visible {
    background: #e6e6e6;
    border-radius: 4px;
    outline: 2px solid #0097f2;
  }

</style>
