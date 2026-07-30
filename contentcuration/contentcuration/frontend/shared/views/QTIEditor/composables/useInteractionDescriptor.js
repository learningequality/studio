import { computed, ref } from 'vue';
import { parseXML } from '../serialization/parseItem';
import { descriptors, registry, DEFAULT_INTERACTION } from '../interactions/index';
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
   * Parses bodyXml and returns the matching descriptor, resolved
   * question type, and any parse error without touching reactive state.
   */
  function inferFromXml(xml, declarations) {
    if (!xml) {
      return { descriptor: registry[DEFAULT_INTERACTION], questionType: null, error: null };
    }
    try {
      const doc = parseXML(xml);
      const interactionEl = doc.documentElement;
      const desc = descriptors.find(d => d.matches(interactionEl)) ?? registry[DEFAULT_INTERACTION];
      return {
        descriptor: desc,
        questionType: desc.getQuestionType(interactionEl, declarations) ?? null,
        error: null,
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[QTI] Failed to parse interaction XML:', e.message);
      return {
        descriptor: registry[DEFAULT_INTERACTION],
        questionType: null,
        error: errorParsingQuestion$(),
      };
    }
  }

  /**
   * Parse the initial XML synchronously during component setup.
   *
   * This ensures `questionType` is immediately available for downstream components
   * on first render, avoiding prop validation warnings that would occur if
   * initialization was deferred to a lifecycle hook.
   */
  const initial = inferFromXml(
    interactionRef.value?.bodyXml,
    interactionRef.value?.responseDeclarations,
  );

  /** Writable ref driven by UI selections after initial parse. */
  const questionType = ref(initial.questionType);
  const parseError = ref(initial.error);

  /**
   * Derived from questionType so the descriptor updates when the user switches
   * question types via the selector. Falls back to the default when no match.
   */
  const descriptor = computed(
    () =>
      descriptors.find(d => d.questionTypes.includes(questionType.value)) ??
      registry[DEFAULT_INTERACTION],
  );

  return { descriptor, questionType, parseError };
}
