import { computed } from 'vue';
import { parseXML } from '../serialization/parseItem';
import { descriptors, registry, DEFAULT_INTERACTION } from '../interactions/index';

/**
 * Composable that analyzes a QTI interaction block's XML and resolves the
 * appropriate plugin descriptor and sub-question type.
 *
 * @param {import('vue').Ref<string>} bodyXmlRef Ref to interaction's bodyXml string
 */
export default function useInteractionDescriptor(bodyXmlRef) {
  const parsed = computed(() => {
    if (!bodyXmlRef.value) {
      return {
        error: null,
        descriptor: registry[DEFAULT_INTERACTION],
        questionType: null,
      };
    }

    try {
      // bodyXml is the full <qti-*-interaction> element — its root IS the interaction.
      const doc = parseXML(bodyXmlRef.value);
      const interactionEl = doc.documentElement;

      const descriptor =
        descriptors.find(d => d.matches(interactionEl)) ?? registry[DEFAULT_INTERACTION];
      const questionType = descriptor.getQuestionType(interactionEl) ?? null;

      return {
        error: null,
        descriptor,
        questionType,
      };
    } catch (e) {
      return {
        error: e.message,
        descriptor: registry[DEFAULT_INTERACTION],
        questionType: null,
      };
    }
  });

  return {
    descriptor: computed(() => parsed.value.descriptor),
    questionType: computed(() => parsed.value.questionType),
    parseError: computed(() => parsed.value.error),
  };
}
