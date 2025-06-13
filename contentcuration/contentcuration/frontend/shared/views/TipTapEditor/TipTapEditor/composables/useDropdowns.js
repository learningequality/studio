import { ref, onMounted, onUnmounted, inject, watch, computed } from 'vue';
import { getTranslator } from '../TipTapEditorStrings';
import { useToolbarActions } from './useToolbarActions';

export function useDropdowns() {
  const selectedFormat = ref('Normal');
  const showHeadersDropdown = ref(false);
  const showPasteDropdown = ref(false);
  const editor = inject('editor', null);

  // This function retrieves the translator instance for localization
  const t = (key, args = {}) => {
    const translator = getTranslator();
    return translator.$tr(key, args);
  };

  // Format detection function
  const updateSelectedFormat = () => {
    if (!editor?.value) return;

    // Check current active format at cursor position
    if (editor.value.isActive('heading', { level: 1 })) {
      selectedFormat.value = 'Header 1';
    } else if (editor.value.isActive('heading', { level: 2 })) {
      selectedFormat.value = 'Header 2';
    } else if (editor.value.isActive('heading', { level: 3 })) {
      selectedFormat.value = 'Header 3';
    } else if (editor.value.isActive('small')) {
      selectedFormat.value = 'small';
    } else {
      selectedFormat.value = 'Normal';
    }
  };

  watch(
    () => editor?.value?.state.selection,
    () => {
      if (editor?.value) {
        updateSelectedFormat();
      }
    },
    { deep: true },
  );

  let offTransaction = null;

  const setupEditorListener = () => {
    if (editor?.value) {
      const handler = () => updateSelectedFormat();
      editor.value.on('transaction', handler);
      offTransaction = () => editor.value.off('transaction', handler);
    }
  };

  // Dropdown management
  const toggleHeadersDropdown = () => {
    showHeadersDropdown.value = !showHeadersDropdown.value;
    showPasteDropdown.value = false;
  };

  const togglePasteDropdown = () => {
    showPasteDropdown.value = !showPasteDropdown.value;
    showHeadersDropdown.value = false;
  };

  const closeAllDropdowns = () => {
    showHeadersDropdown.value = false;
    showPasteDropdown.value = false;
  };

  const selectFormat = format => {
    selectedFormat.value = format.label;
    closeAllDropdowns();
  };

  const handleClickOutside = event => {
    const dropdownContainers = document.querySelectorAll('.dropdown-container');
    let isOutside = true;

    dropdownContainers.forEach(container => {
      if (container.contains(event.target)) {
        isOutside = false;
      }
    });

    if (isOutside) {
      closeAllDropdowns();
    }
  };

  onMounted(() => {
    document.addEventListener('click', handleClickOutside);
    // Setup editor listener when component mounts
    setupEditorListener();
    // Initial format detection
    updateSelectedFormat();
  });

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    if (offTransaction) offTransaction();
  });

  const formatOptions = computed(() => [
    { value: 'small', label: t('formatSmall'), tag: 'small' },
    { value: 'normal', label: t('formatNormal'), tag: 'p' },
    { value: 'h3', label: t('formatHeader3'), tag: 'h3' },
    { value: 'h2', label: t('formatHeader2'), tag: 'h2' },
    { value: 'h1', label: t('formatHeader1'), tag: 'h1' },
  ]);

  const pasteOptions = computed(() => [
    {
      name: 'paste',
      title: t('paste'),
      icon: require('../../assets/icon-paste.svg'),
      handler: useToolbarActions().handlePaste,
    },
    {
      name: 'pasteNoFormat',
      title: t('pasteWithoutFormatting'),
      icon: require('../../assets/icon-pasteNoFormat.svg'),
      handler: useToolbarActions().handlePasteNoFormat,
    },
  ]);

  return {
    selectedFormat,
    showHeadersDropdown,
    showPasteDropdown,
    formatOptions,
    pasteOptions,
    toggleHeadersDropdown,
    togglePasteDropdown,
    closeAllDropdowns,
    selectFormat,
    updateSelectedFormat,
  };
}
