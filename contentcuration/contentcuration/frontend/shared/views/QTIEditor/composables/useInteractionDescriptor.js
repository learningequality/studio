import { computed, ref, onMounted } from 'vue';
import { parseXML } from '../serialization/parseItem';
import { descriptors, registry, DEFAULT_INTERACTION } from '../interactions/index';

/**
 * Composable that manages the question type and descriptor for a single
 * interaction block.
 *
 * Design rationale (three separate type concepts):
 *  - The XML is parsed **once on mount** to infer the initial questionType.
 *  - `questionType` is a writable `ref` so the type-selector UI can change it
 *    without triggering a re-parse of the XML.
 *  - `descriptor` is a `computed` derived from `questionType`, using each
 *    descriptor's `questionTypes` array for the lookup.  This means the
 *    rendered editor component reacts to user selections, not to XML changes.
 *
 * @param {import('vue').Ref<string|null>} bodyXmlRef  Ref to interaction bodyXml string.
 */
export default function useInteractionDescriptor(bodyXmlRef) {
  /** Writable question type — set from XML on mount, then driven by UI selections. */
  const questionType = ref(null);
  /** Any parse error message from the initial XML parse; null when clean. */
  const parseError = ref(null);

  /**
   * Parses bodyXml and returns { descriptor, questionType } without touching
   * any reactive state — pure helper used only on mount.
   */
  function inferFromXml(xml) {
    if (!xml) {
      return { descriptor: registry[DEFAULT_INTERACTION], questionType: null, error: null };
    }
    try {
      const doc = parseXML(xml);
      const interactionEl = doc.documentElement;
      const desc = descriptors.find(d => d.matches(interactionEl)) ?? registry[DEFAULT_INTERACTION];
      return {
        descriptor: desc,
        questionType: desc.getQuestionType(interactionEl) ?? null,
        error: null,
      };
    } catch (e) {
      return {
        descriptor: registry[DEFAULT_INTERACTION],
        questionType: null,
        error: e.message,
      };
    }
  }

  /** Parse XML once when the host component mounts to set the initial state. */
  onMounted(() => {
    const inferred = inferFromXml(bodyXmlRef.value);
    questionType.value = inferred.questionType;
    parseError.value = inferred.error;
  });

  /**
   * Descriptor is derived from the current questionType ref.
   * Uses each descriptor's `questionTypes` array so the lookup stays accurate
   * when the user changes the question type via the selector.
   * Falls back to the default descriptor when no match is found.
   */
  const descriptor = computed(
    () =>
      descriptors.find(d => d.questionTypes.includes(questionType.value)) ??
      registry[DEFAULT_INTERACTION],
  );

  return { descriptor, questionType, parseError };
}
