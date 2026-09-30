import { QTIDeclaration } from '../../serialization/qti/QTIDeclaration';
import { buildXmlNode, parseXML } from '../../serialization/xml';
import CorrectResponse from '../../serialization/qti/declarations/correctResponse';
import Mapping from '../../serialization/qti/declarations/mapping';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { BaseType, QuestionType, RESPONSE_IDENTIFIER } from '../../constants';

const serializer = new XMLSerializer();

/**
 * @typedef {object} TextEntryAnswer
 * @property {string}  id            - Client-side slug (not serialized to XML)
 * @property {string}  value         - The answer value as a string. For numeric this is a
 *                                     float/int string (e.g. "12", "0.5"); for textEntry it
 *                                     is a free-form string (e.g. "Paris").
 * @property {boolean} caseSensitive - textEntry only. When true, "H2O" ≠ "h2o".
 *                                     Always false for numeric answers.
 */

/**
 * @typedef {object} TextEntryState
 * @property {string}            prompt         - HTML content of the question prompt; default ""
 * @property {TextEntryAnswer[]} answers        - Acceptable correct answers.
 *                                                Empty ([]) for freeResponse.
 * @property {number}            expectedLength - Value of the `expected-length` attribute.
 */

/**
 * Default `expected-length` attribute for `<qti-text-entry-interaction>`.
 */
export const DEFAULT_EXPECTED_LENGTH = 50;

/**
 * Default state — used when bodyXml is absent or unparseable.
 *
 * @returns {TextEntryState}
 */
export function _defaultState() {
  return {
    prompt: '',
    answers: [{ id: generateRandomSlug('answer'), value: '', caseSensitive: false }],
    expectedLength: DEFAULT_EXPECTED_LENGTH,
  };
}

/**
 * Serializes the body element children to an HTML string, excluding the
 * element that directly contains the `<qti-text-entry-interaction>`.
 *
 * @param {Element} bodyEl - The `<qti-item-body>` element
 * @returns {string}
 */
function extractPromptHTML(bodyEl) {
  const clone = bodyEl.cloneNode(true);
  const interactionEl = clone.querySelector('qti-text-entry-interaction');
  if (!interactionEl) return '';

  const interactionContainer = interactionEl.parentElement;
  if (
    interactionContainer &&
    interactionContainer !== clone &&
    interactionContainer.tagName.toLowerCase() === 'p'
  ) {
    interactionContainer.remove();
  } else {
    interactionEl.remove();
  }

  return clone.innerHTML.trim();
}

/**
 * Extract correct answer values from the response declaration string.
 * Returns an array of `{ id, value, caseSensitive }` objects, or [] when no
 * correct response is declared (i.e. free-response items).
 *
 * Supports both float (numeric) and string (textEntry) base-types.
 * Answers are the correct response values plus any full-credit `map-key`s.
 * For string base-types `caseSensitive` comes from the declaration's
 * <qti-mapping>, matched by `map-key`; it is always false for float.
 *
 * @param {string[]} responseDeclarations
 * @returns {{ id: string, value: string, caseSensitive: boolean }[]}
 */
export function _extractAnswers(responseDeclarations) {
  const [declXml] = responseDeclarations || [];
  if (!declXml) return [];

  try {
    const declaration = QTIDeclaration.fromXML(parseXML(declXml).documentElement);
    const { baseType, correctResponse } = declaration;

    if (baseType !== BaseType.FLOAT && baseType !== BaseType.STRING) {
      // eslint-disable-next-line no-console
      console.error(`[QTI Editor] Unsupported text-entry base-type: ${baseType}`);
      return [];
    }

    const mapEntries = declaration.mapping?.entries ?? [];
    // Key on the XML string form: both map-key and correct-response values are coerced
    // on parse (empty → null under QTI NULL semantics), so formatting both back matches
    // them on equal terms.
    const caseSensitivity = new Map(
      mapEntries.map(entry => [declaration.formatValue(entry.mapKey), entry.caseSensitive]),
    );
    // Legacy conversion writes only the first accepted answer as correct and maps them
    // all, so every full-credit key is an answer too. It writes no correct response
    // for an answerless input question.
    const values = new Set([
      ...(correctResponse ?? []).map(value => declaration.formatValue(value)),
      ...mapEntries
        .filter(entry => entry.mappedValue >= 1)
        .map(entry => declaration.formatValue(entry.mapKey)),
    ]);

    return [...values].map(value => ({
      id: generateRandomSlug('answer'),
      value,
      // An answer with no matching qti-map-entry — including every answer in an
      // item authored before mappings were written — takes the XSD default, false.
      // Case sensitivity is a string-only concept, so numeric answers never read it.
      caseSensitive: baseType === BaseType.STRING && (caseSensitivity.get(value) ?? false),
    }));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[QTI Editor] Failed to parse text-entry response declaration:', err);
    return [];
  }
}

/**
 * Parse a `<qti-item-body>` XML string + response declarations → TextEntryState.
 *
 * `bodyXml` is the serialized `<qti-item-body>` (not just the interaction
 * element) because the prompt lives in the body siblings, not in a
 * `<qti-prompt>` child.
 *
 * @param {string} bodyXml - Serialized `<qti-item-body>` element
 * @param {string[]} responseDeclarations
 * @returns {TextEntryState}
 */
export function parseTextEntryInteraction(bodyXml, responseDeclarations) {
  if (!bodyXml) return _defaultState();

  let bodyEl;
  try {
    const doc = parseXML(bodyXml);
    bodyEl = doc.documentElement;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[QTI Editor] Failed to parse text-entry interaction XML:', err);
    return _defaultState();
  }

  const interactionEl = bodyEl.querySelector('qti-text-entry-interaction');
  if (!interactionEl) return _defaultState();

  const expectedLength = parseInt(
    interactionEl.getAttribute('expected-length') ?? String(DEFAULT_EXPECTED_LENGTH),
    10,
  );
  const prompt = extractPromptHTML(bodyEl);
  const answers = _extractAnswers(responseDeclarations);

  return { prompt, answers, expectedLength };
}

/**
 * Serialize TextEntryState → { bodyXml, responseDeclarations }.
 *
 * @param {TextEntryState} state
 * @param {string} questionType - One of QuestionType.NUMERIC, TEXT_ENTRY, FREE_RESPONSE
 * @param {{ baseType: string, cardinality: string }} declarationSchema
 * @returns {{ bodyXml: string, responseDeclarations: string[] }}
 */
export function buildTextEntryInteractionXML(state, questionType, declarationSchema) {
  const { prompt, answers, expectedLength } = state;
  const { baseType, cardinality } = declarationSchema;

  const interactionAttrs = {
    'response-identifier': RESPONSE_IDENTIFIER,
  };

  const effectiveExpectedLength = expectedLength || DEFAULT_EXPECTED_LENGTH;
  if (effectiveExpectedLength) {
    interactionAttrs['expected-length'] = effectiveExpectedLength;
  }

  const interactionEl = buildXmlNode({
    tag: 'qti-text-entry-interaction',
    attrs: interactionAttrs,
  });

  // Wrap the interaction in <p> as QTI inline elements must appear in flow content.
  const interactionParagraph = buildXmlNode({
    tag: 'p',
    children: [interactionEl],
  });

  // The prompt is authored HTML, so it goes in through innerHTML: buildXmlNode parses it
  // and adopts the result into the item's namespace.
  const bodyEl = buildXmlNode({ tag: 'qti-item-body', innerHTML: prompt || '' });
  bodyEl.appendChild(interactionParagraph);
  const bodyXml = serializer.serializeToString(bodyEl);

  // Build the response declaration.
  const declaration = new QTIDeclaration({
    identifier: RESPONSE_IDENTIFIER,
    baseType,
    cardinality,
    tag: 'qti-response-declaration',
  });

  // CorrectResponse before Mapping: getXML emits children in capability insertion
  // order, and the schema requires <qti-correct-response> to precede <qti-mapping>.
  if (questionType !== QuestionType.FREE_RESPONSE && answers.length !== 0) {
    new CorrectResponse(
      answers.map(a => a.value),
      declaration,
    );

    // <qti-mapping> is the spec's home for per-answer case sensitivity (string-only).
    // mapped-value is schema-required but unused: the editor does not score responses.
    if (baseType === BaseType.STRING) {
      new Mapping(
        {
          defaultValue: 0,
          lowerBound: null,
          upperBound: null,
          entries: answers.map(a => ({
            // Trimmed to match how _extractAnswers reads <qti-value> text back.
            mapKey: a.value.trim(),
            mappedValue: 1,
            caseSensitive: Boolean(a.caseSensitive),
          })),
        },
        declaration,
      );
    }
  }

  const declarationXml = serializer.serializeToString(declaration.getXML());
  return { bodyXml, responseDeclarations: [declarationXml] };
}
