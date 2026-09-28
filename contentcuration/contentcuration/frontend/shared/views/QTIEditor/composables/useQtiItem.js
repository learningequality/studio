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
 *   itemBodyXml: import('vue').Ref<string>,
 *   interactions: import('vue').Ref<Array<{ bodyXml: string, responseDeclarations: string[] }>>,
 *   hints: import('vue').Ref<Array<{ id: string, content: string }>>,
 *   parseError: import('vue').Ref<string | null>,
 *   rawData: import('vue').ComputedRef<string>,
 * }}
 */
export default function useQtiItem(rawXml, { bodyXml, responseDeclarations } = {}) {
  const identifier = ref('');
  const title = ref('');
  const language = ref('');
  const interactions = ref([]);
  /** The item's `<qti-item-body>` as parsed, whether or not it holds an interaction. */
  const itemBodyXml = ref('');
  /**
   * Hints belong to the item, not to any one interaction, so they live here beside
   * identifier and title — mutable, and read back by the rawData computed below.
   */
  const hints = ref([]);
  const parseError = ref(null);

  if (rawXml) {
    try {
      const model = parseItem(rawXml);
      identifier.value = model.identifier;
      title.value = model.title;
      language.value = model.language;
      interactions.value = model.interactions;
      itemBodyXml.value = model.itemBodyXml;
      hints.value = model.hints;
    } catch (e) {
      parseError.value = e.message;
    }
  }

  /**
   * Re-assembles the full QTI item XML whenever identifier, title, language,
   * hints, bodyXml, or responseDeclarations change. The interaction parts are
   * only present when the caller passes in bodyXml and responseDeclarations refs.
   */
  const rawData = computed(() =>
    assembleItemXml({
      identifier: identifier.value,
      title: title.value,
      language: language.value,
      bodyXml: bodyXml?.value ?? '',
      responseDeclarations: responseDeclarations?.value ?? [],
      hints: hints.value,
    }),
  );

  return {
    identifier,
    title,
    language,
    itemBodyXml,
    interactions,
    hints,
    parseError,
    rawData,
  };
}
