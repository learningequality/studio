import { computed, inject } from 'vue';
import { useToolbarActions } from './useToolbarActions';

export function useFormatControls() {
  const editor = inject('editor', null);
  const { handleFormatChange } = useToolbarActions();

  // Define the format hierarchy (order matters for +/- navigation)
  const formatHierarchy = computed(() => [
    'small', // Level 0 - smallest
    'normal', // Level 1 - default
    'h3', // Level 2 - header 3
    'h2', // Level 3 - header 2
    'h1', // Level 4 - largest
  ]);

  const getCurrentFormatLevel = () => {
    if (!editor?.value) return 1; // Default to normal

    if (editor.value.isActive('heading', { level: 1 })) return 4;
    if (editor.value.isActive('heading', { level: 2 })) return 3;
    if (editor.value.isActive('heading', { level: 3 })) return 2;
    if (editor.value.isActive('small')) return 0;
    return 1;
  };

  const currentFormatLevel = computed(() => getCurrentFormatLevel());

  // Check if we can move up hierarchy
  const canIncreaseFormat = computed(() => {
    return currentFormatLevel.value < formatHierarchy.value.length - 1;
  });

  // Check if we can move down hierarchy
  const canDecreaseFormat = computed(() => {
    return currentFormatLevel.value > 0;
  });

  const increaseFormat = () => {
    if (!canIncreaseFormat.value || !editor?.value) return;

    const newLevel = currentFormatLevel.value + 1;
    const newFormat = formatHierarchy.value[newLevel];

    handleFormatChange(newFormat);
  };

  const decreaseFormat = () => {
    if (!canDecreaseFormat.value || !editor?.value) return;

    const newLevel = currentFormatLevel.value - 1;
    const newFormat = formatHierarchy.value[newLevel];

    handleFormatChange(newFormat);
  };

  return {
    currentFormatLevel,
    canIncreaseFormat,
    canDecreaseFormat,
    increaseFormat,
    decreaseFormat,
    formatHierarchy,
  };
}
