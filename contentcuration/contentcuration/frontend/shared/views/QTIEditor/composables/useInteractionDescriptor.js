import { computed, ref } from 'vue';
import { descriptors } from '../interactions/index';
import { resolveDescriptor } from '../interactions/resolveDescriptor';
import { qtiEditorStrings } from '../qtiEditorStrings';

const { errorParsingQuestion$ } = qtiEditorStrings;

/**
 * Composable that resolves the interaction descriptor and question type for a
 * single interaction block.
 *
 * @param {import('vue').Ref<object>} interactionRef
 *   Ref to the interaction block { bodyXml, responseDeclarations }.
 */
export default function useInteractionDescriptor(interactionRef) {
  /**
   * Resolve the initial XML synchronously during component setup.
   *
   * This ensures `questionType` is immediately available for downstream components
   * on first render, avoiding prop validation warnings that would occur if
   * initialization was deferred to a lifecycle hook.
   */
  const initial = resolveDescriptor(
    interactionRef.value?.bodyXml,
    interactionRef.value?.responseDeclarations,
  );

  /** Writable ref driven by UI selections after initial parse. */
  const questionType = ref(initial.questionType);
  const parseError = ref(initial.error ? errorParsingQuestion$() : null);

  /**
   * Derived from questionType so the descriptor updates when the user switches
   * question types via the selector. Null when no descriptor handles the interaction.
   */
  const descriptor = computed(
    () => descriptors.find(d => d.questionTypes.includes(questionType.value)) ?? null,
  );

  return { descriptor, questionType, parseError };
}
