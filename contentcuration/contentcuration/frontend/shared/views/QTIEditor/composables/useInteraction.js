import { ref, computed, watch, onUnmounted } from 'vue';
import debounce from 'lodash/debounce';

/**
 * Base composable for all interaction editors.
 *
 * Handles the parse → state → buildXML → validate lifecycle that every
 * interaction plugin must go through. Individual interaction composables
 * (e.g. useChoiceInteraction) call this and add mutation methods on top.
 *
 * Validation runs immediately when called explicitly (e.g. when closing a
 * panel), but is debounced when triggered by state changes so that errors
 * only appear after the user pauses typing (400 ms), avoiding noisy
 * inline error flicker on every keystroke.
 *
 * @param {import('../interactions/defineInteraction').InteractionDescriptor} descriptor
 * @param {{ bodyXml: string, responseDeclarations: string[] }} interactionBlock
 * @param {import('vue').Ref<string|null>} questionType
 * @returns {{
 *   state: import('vue').Ref<object>,
 *   bodyXml: import('vue').ComputedRef<string>,
 *   declarations: import('vue').ComputedRef<string[]>,
 *   errors: import('vue').Ref<Array<{ code: string, id?: string }>>,
 *   runValidation: () => void,
 * }}
 */
export function useInteraction(descriptor, interactionBlock, questionType) {
  const initialState = descriptor.parse(
    interactionBlock.bodyXml,
    interactionBlock.responseDeclarations,
  );

  const state = ref(initialState);

  // Rebuild XML whenever state or questionType changes.
  const built = computed(() => {
    if (!questionType.value) return { bodyXml: '', declarations: [] };
    return descriptor.buildXML(state.value, questionType.value);
  });

  const bodyXml = computed(() => built.value.bodyXml);
  const declarations = computed(() => built.value.declarations);

  // Errors start empty — never shown automatically so authors aren't startled on first load.
  const errors = ref([]);

  /** Immediately validates and updates errors. Use this for explicit triggers (e.g. close). */
  function runValidation() {
    errors.value = descriptor.validate(state.value, questionType.value);
  }

  /**
   * Debounced version used by the state watcher — waits 400 ms after the user
   * stops typing before showing inline errors.
   */
  const debouncedValidation = debounce(runValidation, 400);

  // Cancel any pending debounce when the component is torn down.
  onUnmounted(() => debouncedValidation.cancel());

  watch([state, questionType], debouncedValidation, { deep: true });

  return { state, bodyXml, declarations, errors, runValidation };
}
