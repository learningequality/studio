import { ref } from 'vue';
import { parseItem } from '../serialization/parseItem';

/**
 * Composable that parses a raw QTI XML string once and exposes the
 * structured item model as reactive refs.
 *
 * Scope: read / parse only. No dirty tracking, no XML assembly, no emit-up.
 *
 * @param {string | null | undefined} rawData - Raw QTI XML string from item.raw_data
 * @returns {{
 *   identifier: import('vue').Ref<string>,
 *   title: import('vue').Ref<string>,
 *   language: import('vue').Ref<string>,
 *   interactions: import('vue').Ref<Array<{ bodyXml: string, responseDeclarations: string[] }>>,
 *   parseError: import('vue').Ref<string | null>,
 * }}
 */
export default function useQtiItem(rawData) {
  const identifier = ref('');
  const title = ref('');
  const language = ref('');
  const interactions = ref([]);
  const parseError = ref(null);

  if (rawData) {
    try {
      const model = parseItem(rawData);
      identifier.value = model.identifier;
      title.value = model.title;
      language.value = model.language;
      interactions.value = model.interactions;
    } catch (e) {
      parseError.value = e.message;
    }
  }

  return { identifier, title, language, interactions, parseError };
}
