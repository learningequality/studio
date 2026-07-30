import { QTIDeclaration } from '../../serialization/qti/QTIDeclaration';
import { parseXML } from '../../serialization/parseItem';
import { buildXmlNode } from '../../serialization/assembleItem';
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
 * Build a value → caseSensitive lookup from a declaration's <qti-mapping>.
 *
 * Entries whose map-key matches no correct-response value are never looked up, and
 * answers with no matching entry fall back to the spec default at the call site —
 * neither case is an error.
 *
 * @param {Element} declEl - The <qti-response-declaration> element
 * @returns {Map<string, boolean>}
 */
function caseSensitivityByValue(declEl) {
  let declaration;
  try {
    declaration = QTIDeclaration.fromXML(declEl);
  } catch (err) {
    // QTIDeclaration validates the declaration more strictly than answer extraction
    // needs — a missing identifier, say, makes it unmodellable. The correct-response
    // values are still readable, so degrade to the spec default for case sensitivity
    // rather than discarding the author's answers.
    // eslint-disable-next-line no-console
    console.warn('[QTI Editor] Could not read <qti-mapping> case sensitivity:', err);
    return new Map();
  }

  const { mapping } = declaration;
  return new Map(
    (mapping?.entries ?? []).map(entry => [
      // Key on the XML string form: map-key is coerced on parse (an empty key becomes
      // null under QTI NULL semantics) while answer values stay raw <qti-value> text.
      declaration.formatValue(entry.mapKey),
      entry.caseSensitive,
    ]),
  );
}

/**
 * Extract correct answer values from the response declaration string.
 * Returns an array of `{ id, value, caseSensitive }` objects, or [] when no
 * correct response is declared (i.e. free-response items).
 *
 * Supports both float (numeric) and string (textEntry) base-types.
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
    const declEl = parseXML(declXml).documentElement;
    const isFloat = declEl.getAttribute('base-type') === BaseType.FLOAT;
    const isString = declEl.getAttribute('base-type') === BaseType.STRING;

    if (!isFloat && !isString) {
      // eslint-disable-next-line no-console
      console.error(
        `[QTI Editor] Unsupported text-entry base-type: ${declEl.getAttribute('base-type')}`,
      );
      return [];
    }

    const correctResponseEl = declEl.querySelector('qti-correct-response');
    if (!correctResponseEl) {
      if (isFloat) {
        // eslint-disable-next-line no-console
        console.error('[QTI Editor] Missing <qti-correct-response> for numeric interaction');
      }
      return [];
    }

    const valueEls = [...correctResponseEl.querySelectorAll('qti-value')];
    if (valueEls.length === 0) return [];

    const caseSensitivity = isString ? caseSensitivityByValue(declEl) : null;

    return valueEls.map(el => {
      const value = el.textContent.trim();
      return {
        id: generateRandomSlug('answer'),
        value,
        // Per spec, an answer with no matching qti-map-entry is case-sensitive.
        caseSensitive: isString ? (caseSensitivity.get(value) ?? true) : false,
      };
    });
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

  // Build body children: prompt HTML nodes (if any) followed by the interaction paragraph.
  const bodyChildren = [];
  if (prompt) {
    const promptDoc = parseXML(`<!DOCTYPE html><body>${prompt}</body>`, 'text/html');
    bodyChildren.push(...promptDoc.body.childNodes);
  }
  bodyChildren.push(interactionParagraph);

  const bodyEl = buildXmlNode({ tag: 'qti-item-body', children: bodyChildren });
  const bodyXml = serializer.serializeToString(bodyEl);

  // Build the response declaration.
  const declaration = new QTIDeclaration({
    identifier: RESPONSE_IDENTIFIER,
    baseType,
    cardinality,
    tag: 'qti-response-declaration',
  });

  // CorrectResponse must be constructed before Mapping: QTIDeclaration.getXML emits its
  // children in capability insertion order, and the QTI schema requires
  // <qti-correct-response> to precede <qti-mapping>.
  if (questionType !== QuestionType.FREE_RESPONSE && answers.length !== 0) {
    new CorrectResponse(
      answers.map(a => a.value),
      declaration,
    );

    // <qti-mapping> is the spec-defined home for per-answer case sensitivity, which
    // is a string-only concept. mapped-value is required by the schema; the authoring
    // editor does not score responses, so every accepted answer maps to the same value.
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
