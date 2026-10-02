import { ref, onMounted, onUnmounted, inject, watch, computed } from 'vue';
import { getTipTapEditorStrings } from '../TipTapEditorStrings';
import { useToolbarActions } from './useToolbarActions';

export function useDropdowns() {
  const selectedFormat = ref('Normal');
  const editor = inject('editor', null);

  const {
    formatSmall$,
    formatNormal$,
    formatHeader1$,
    formatHeader2$,
    formatHeader3$,
    copy$,
    paste$,
    pasteWithoutFormatting$,
  } = getTipTapEditorStrings();

  // Format detection function
  const updateSelectedFormat = () => {
    if (!editor?.value) return;

    // Check current active format at cursor position
    if (editor.value.isActive('heading', { level: 1 })) {
      selectedFormat.value = formatHeader1$();
    } else if (editor.value.isActive('heading', { level: 2 })) {
      selectedFormat.value = formatHeader2$();
    } else if (editor.value.isActive('heading', { level: 3 })) {
      selectedFormat.value = formatHeader3$();
    } else if (editor.value.isActive('small')) {
      selectedFormat.value = formatSmall$();
    } else {
      selectedFormat.value = formatNormal$();
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

  const selectFormat = format => {
    selectedFormat.value = format.label;
  };

  onMounted(() => {
    // Setup editor listener when component mounts
    setupEditorListener();
    // Initial format detection
    updateSelectedFormat();
  });

  onUnmounted(() => {
    if (offTransaction) offTransaction();
  });

  const formatOptions = computed(() => [
    { value: 'small', label: formatSmall$(), tag: 'small' },
    { value: 'normal', label: formatNormal$(), tag: 'p' },
    { value: 'h3', label: formatHeader3$(), tag: 'h3' },
    { value: 'h2', label: formatHeader2$(), tag: 'h2' },
    { value: 'h1', label: formatHeader1$(), tag: 'h1' },
  ]);

  const pasteOptions = computed(() => [
    {
      name: 'paste',
      title: paste$(),
      icon: require('../../assets/icon-paste.svg'),
      handler: useToolbarActions().handlePaste,
    },
    {
      name: 'pasteNoFormat',
      title: pasteWithoutFormatting$(),
      icon: require('../../assets/icon-pasteNoFormat.svg'),
      handler: useToolbarActions().handlePasteNoFormat,
    },
  ]);

  const clipboardOptions = computed(() => [
    {
      name: 'copy',
      title: copy$(),
      icon: require('../../assets/icon-copy.svg'),
      handler: useToolbarActions().handleCopy,
    },
    ...pasteOptions.value,
  ]);

  return {
    selectedFormat,
    formatOptions,
    pasteOptions,
    clipboardOptions,
    selectFormat,
    updateSelectedFormat,
  };
}
