import { QTIDeclaration } from '../../serialization/qti/QTIDeclaration';
import {
  buildXmlNode,
  hasNonNamespaceAttributes,
  isContentNode,
  parseXML,
  serializeAsHtml,
  wrapInlineRuns,
} from '../../serialization/xml';
import CorrectResponse from '../../serialization/qti/declarations/correctResponse';
import Mapping from '../../serialization/qti/declarations/mapping';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { parseXsdDouble } from '../../utils/math';
import { BaseType, QuestionType, RESPONSE_IDENTIFIER } from '../../constants';

const serializer = new XMLSerializer();

/**
 * @typedef {object} TextEntryAnswer
 * @property {string}  id            - Client-side slug (not serialized to XML)
 * @property {string}  value         - The answer value as a string. For numeric this is the
 *                                     authored text, valid or not (e.g. "12", "1e-5");
 *                                     for textEntry it is a free-form string (e.g. "Paris").
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

function contentOf(el) {
  return [...el.childNodes].filter(isContentNode);
}

function hasContentAfter(node) {
  for (let sibling = node.nextSibling; sibling; sibling = sibling.nextSibling) {
    if (isContentNode(sibling)) {
      return true;
    }
  }
  return false;
}

/**
 * Whether the item body has the shape buildTextEntryInteractionXML writes: the prompt, then a
 * `<p>` holding only the interaction. Anything else would be dropped from the interaction's
 * `<p>`, or moved ahead of it if it follows. Legacy conversion wraps the same shape in a bare
 * `<div>`, the body's only content.
 *
 * @param {Element} bodyEl - The `<qti-item-body>` element
 * @returns {boolean}
 */
export function isSupportedTextEntryBody(bodyEl) {
  const paragraph = bodyEl.querySelector('qti-text-entry-interaction').parentElement;
  if (
    paragraph.localName !== 'p' ||
    hasNonNamespaceAttributes(paragraph) ||
    contentOf(paragraph).length > 1 ||
    hasContentAfter(paragraph)
  ) {
    return false;
  }
  const container = paragraph.parentElement;
  return (
    container === bodyEl ||
    (container.localName === 'div' &&
      !hasNonNamespaceAttributes(container) &&
      container.parentElement === bodyEl &&
      contentOf(bodyEl).length === 1)
  );
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

  return serializeAsHtml([...clone.childNodes], bodyEl.namespaceURI).trim();
}

/**
 * Numeric answers as authored, read from the XML rather than through
 * `QTIDeclaration.fromXML`: its float coercion would throw on an invalid value (dropping
 * every answer) or truncate it (`1.2.3` → 1.2), hiding it from validation.
 *
 * @param {Element} declarationEl - A float `<qti-response-declaration>`
 * @returns {TextEntryAnswer[]}
 */
function extractNumericAnswers(declarationEl) {
  // Built only to validate: throws on a bad identifier or cardinality, as fromXML does.
  new QTIDeclaration({
    identifier: declarationEl.getAttribute('identifier'),
    baseType: BaseType.FLOAT,
    cardinality: declarationEl.getAttribute('cardinality') ?? undefined,
  });
  // Run only to throw: fromXML rejects a non-numeric default value, dropping every answer.
  for (const el of declarationEl.querySelectorAll(':scope > qti-default-value qti-value')) {
    QTIDeclaration.coerceValue(el.textContent.trim(), BaseType.FLOAT);
  }

  // Repeats stay, so validation flags them as it does in the editor.
  const values = [...declarationEl.querySelectorAll(':scope > qti-correct-response qti-value')].map(
    el => el.textContent.trim(),
  );
  // Full-credit map-keys are answers too, as on the string path. One equal in value to an
  // answer already read (`5.0` for `5`) is that answer, so it is not added again.
  const keys = new Set(values.map(value => parseXsdDouble(value) ?? value));
  for (const entry of declarationEl.querySelectorAll(':scope > qti-mapping qti-map-entry')) {
    const value = (entry.getAttribute('map-key') ?? '').trim();
    const key = parseXsdDouble(value) ?? value;
    if (parseFloat(entry.getAttribute('mapped-value')) >= 1 && !keys.has(key)) {
      keys.add(key);
      values.push(value);
    }
  }
  return values.map(value => ({
    id: generateRandomSlug('answer'),
    value,
    caseSensitive: false,
  }));
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
    const declarationEl = parseXML(declXml).documentElement;
    if (declarationEl.getAttribute('base-type') === BaseType.FLOAT) {
      return extractNumericAnswers(declarationEl);
    }

    const declaration = QTIDeclaration.fromXML(declarationEl);
    const { baseType, correctResponse } = declaration;

    if (baseType !== BaseType.STRING) {
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
      caseSensitive: caseSensitivity.get(value) ?? false,
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
  const promptEl = buildXmlNode({ tag: 'div', innerHTML: prompt || '' });
  const bodyEl = buildXmlNode({
    tag: 'qti-item-body',
    children: [...wrapInlineRuns(promptEl), interactionParagraph],
  });
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
