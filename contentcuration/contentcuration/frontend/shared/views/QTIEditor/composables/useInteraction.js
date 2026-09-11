import { ref, computed, watch } from 'vue';

/**
 * Base composable for all interaction editors.
 *
 * Handles the parse → state → buildXML → validate lifecycle that every
 * interaction plugin must go through. Individual interaction composables
 * (e.g. useChoiceInteraction) call this and add mutation methods on top.
 *
 * Validation runs on every state or questionType change, so errors always describe the
 * state the editor is showing. runValidation is exposed for explicit triggers, such as
 * closing a panel.
 *
 * @param {import('../interactions/InteractionDescriptor').InteractionDescriptor} descriptor
 * @param {{ bodyXml: string, responseDeclarations: string[] }} interactionBlock
 * @param {import('vue').Ref<string|null>} questionType
 * @returns {{
 *   state: import('vue').Ref<object>,
 *   bodyXml: import('vue').ComputedRef<string>,
 *   responseDeclarations: import('vue').ComputedRef<string[]>,
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
  const interaction = computed(() => {
    if (!questionType.value) return { bodyXml: '', responseDeclarations: [] };
    return descriptor.buildXML(state.value, questionType.value);
  });

  const bodyXml = computed(() => interaction.value.bodyXml);
  const responseDeclarations = computed(() => interaction.value.responseDeclarations);

  const errors = ref([]);

  /** Validates and updates errors. Exposed for explicit triggers (e.g. close). */
  function runValidation() {
    errors.value = descriptor.validate(state.value, questionType.value);
  }

  watch([state, questionType], runValidation, { deep: true, immediate: true });

  return { state, bodyXml, responseDeclarations, errors, runValidation };
}
