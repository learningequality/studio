import { ref, computed } from 'vue';
import { parseItem } from '../serialization/parseItem';
import { assembleItemXml } from '../serialization/assembleItem';

/**
 * Composable that parses a raw QTI XML string once and exposes the
 * structured item model as reactive refs.
 *
 * Optionally accepts reactive `bodyXml` and `responseDeclarations` refs
 * (owned by the editor) and exposes a `rawData` computed that re-assembles
 * the full item XML whenever any of the five values change.
 *
 * @param {string | null | undefined} rawData - Raw QTI XML string from item.raw_data
 * @param {{ bodyXml?: import('vue').Ref<string>,
 *   responseDeclarations?: import('vue').Ref<string[]> }} [editorRefs]
 * @returns {{
 *   identifier: import('vue').Ref<string>,
 *   title: import('vue').Ref<string>,
 *   language: import('vue').Ref<string>,
 *   interactions: import('vue').Ref<Array<{ bodyXml: string, responseDeclarations: string[] }>>,
 *   parseError: import('vue').Ref<string | null>,
 *   rawData: import('vue').ComputedRef<string>,
 * }}
 */
export default function useQtiItem(rawXml, { bodyXml, responseDeclarations } = {}) {
  const identifier = ref('');
  const title = ref('');
  const language = ref('');
  const interactions = ref([]);
  const parseError = ref(null);

  if (rawXml) {
    try {
      const model = parseItem(rawXml);
      identifier.value = model.identifier;
      title.value = model.title;
      language.value = model.language;
      interactions.value = model.interactions;
    } catch (e) {
      parseError.value = e.message;
    }
  }

  /**
   * Re-assembles the full QTI item XML whenever identifier, title, language,
   * bodyXml, or responseDeclarations change. Only available when the caller
   * passes in bodyXml and responseDeclarations refs.
   */
  const rawData = computed(() =>
    assembleItemXml({
      identifier: identifier.value,
      title: title.value,
      language: language.value,
      bodyXml: bodyXml?.value ?? '',
      responseDeclarations: responseDeclarations?.value ?? [],
    }),
  );

  return { identifier, title, language, interactions, parseError, rawData };
}
