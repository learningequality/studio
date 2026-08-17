import { readonly } from 'vue';
import { generateRandomSlug } from '../utils/generateRandomSlug';
import { orderingInteractionDescriptor } from '../interactions/ordering/OrderingInteractionDescriptor';
import { useInteraction } from './useInteraction';

/**
 * Composable for the ordering interaction editor.
 *
 * @param {{ bodyXml: string, responseDeclarations: string[] }} interactionBlock
 * @param {import('vue').Ref<string|null>} questionType
 */
export function useOrderingInteraction(interactionBlock, questionType) {
  const base = useInteraction(orderingInteractionDescriptor, interactionBlock, questionType);
  const { state } = base;

  function addItem() {
    state.value = {
      ...state.value,
      items: [...state.value.items, { id: generateRandomSlug('order'), content: '', fixed: false }],
    };
  }

  function removeItem(id) {
    if (state.value.items.length <= 1) return;
    state.value = {
      ...state.value,
      items: state.value.items.filter(item => item.id !== id),
    };
  }

  function moveItemUp(id) {
    const items = [...state.value.items];
    const idx = items.findIndex(item => item.id === id);
    if (idx <= 0) return;
    [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
    state.value = { ...state.value, items };
  }

  function moveItemDown(id) {
    const items = [...state.value.items];
    const idx = items.findIndex(item => item.id === id);
    if (idx === -1 || idx >= items.length - 1) return;
    [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
    state.value = { ...state.value, items };
  }

  function setItemContent(id, html) {
    state.value = {
      ...state.value,
      items: state.value.items.map(item => (item.id === id ? { ...item, content: html } : item)),
    };
  }

  function setPrompt(html) {
    state.value = { ...state.value, prompt: html };
  }

  return {
    ...base,
    state: readonly(state),
    addItem,
    removeItem,
    moveItemUp,
    moveItemDown,
    setItemContent,
    setPrompt,
  };
}
