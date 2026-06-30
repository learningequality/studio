import { ref, computed } from 'vue';

/**
 * Base composable for all interaction editors.
 *
 * Handles the parse → state → buildXML → validate lifecycle that every
 * interaction plugin must go through. Individual interaction composables
 * (e.g. useChoiceInteraction) call this and add mutation methods on top.
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

  function runValidation() {
    errors.value = descriptor.validate(state.value, questionType.value);
  }

  return { state, bodyXml, declarations, errors, runValidation };
}
