import { QTIDeclaration } from '../../serialization/qti/QTIDeclaration';
import { parseXML } from '../../serialization/parseItem';
import { buildXmlNode } from '../../serialization/assembleItem';
import CorrectResponse from '../../serialization/qti/declarations/correctResponse';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { BaseType, RESPONSE_IDENTIFIER } from '../../constants';

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
 *                                                FREE_RESPONSE_EXPECTED_LENGTH for freeResponse;
 *                                                0 (absent) for numeric and textEntry.
 */

/**
 * Default `expected-length` attribute written on `<qti-text-entry-interaction>`
 * for free-response items. The QTI 3.0 spec does not mandate a value; 50 is a
 * widely-used authoring convention (sourced from the textEntry interaction PR
 * description). Change this constant if your platform uses a different default.
 *
 * This attribute is informational — it hints to the player how wide to render
 * the input box. It has no effect on scoring.
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
    answers: [],
    expectedLength: DEFAULT_EXPECTED_LENGTH,
  };
}

/**
 * Serialize body children to an HTML string, excluding the element that
 * directly contains the `<qti-text-entry-interaction>`.
 *
 * buildTextEntryInteractionXML wraps body content in a single `<div>`, so we
 * look inside that wrapper for prompt children and the interaction container.
 *
 * @param {Element} bodyEl - The wrapper element that contains both the
 *                           prompt and the text entry interaction
 * @returns {string}
 */
function extractPromptHTML(bodyEl) {
  const clone = bodyEl.cloneNode(true);
  const interactionEl = clone.querySelector('qti-text-entry-interaction');
  if (!interactionEl) return '';

  // The interaction typically sits in a <p>; remove the <p> (or just the interaction)
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

  // buildTextEntryInteractionXML wraps everything in a single outer <div>.
  // If the body has exactly one <div> child, extract from inside it.
  const bodyChildren = clone.children;
  const searchRoot =
    bodyChildren.length === 1 && bodyChildren[0].tagName.toLowerCase() === 'div'
      ? bodyChildren[0]
      : clone;

  return searchRoot.innerHTML.replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '').trim();
}

/**
 * Extract correct answer values from the response declaration string.
 * Returns an array of `{ id, value, caseSensitive }` objects, or [] when no
 * correct response is declared (i.e. free-response items).
 *
 * Supports both float (numeric) and string (textEntry) base-types.
 * The `caseSensitive` field is only meaningful for string base-type answers.
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

    return valueEls.map(el => ({
      id: generateRandomSlug('answer'),
      value: el.textContent.trim(),
      // case-sensitive is only meaningful for string base-type answers.
      caseSensitive: isString && el.getAttribute('case-sensitive') === 'true',
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
 * The output `bodyXml` is a full `<qti-item-body>` so that parseItem can
 * store it and the next parse() call can extract the prompt correctly.
 *
 * @param {TextEntryState} state
 * @param {string} questionType - QuestionType.NUMERIC | QuestionType.FREE_RESPONSE
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

  // Build the body content: prompt HTML (if any) followed by the interaction paragraph.
  const divChildren = [];
  if (prompt) {
    const promptDoc = new DOMParser().parseFromString(
      `<!DOCTYPE html><body>${prompt}</body>`,
      'text/html',
    );
    divChildren.push(...promptDoc.body.childNodes);
  }
  divChildren.push(interactionParagraph);

  const bodyEl = buildXmlNode({
    tag: 'qti-item-body',
    children: [buildXmlNode({ tag: 'div', children: divChildren })],
  });

  const bodyXml = serializer.serializeToString(bodyEl);

  // Build the response declaration.
  const declaration = new QTIDeclaration({
    identifier: RESPONSE_IDENTIFIER,
    baseType,
    cardinality,
    tag: 'qti-response-declaration',
  });

  // Write a correct-response for numeric and textEntry (not freeResponse).
  const isFreeResponse = baseType === BaseType.STRING && answers.length === 0;
  if (!isFreeResponse && answers.length > 0) {
    if (baseType === BaseType.STRING) {
      // Build <qti-correct-response> manually so we can write the optional
      // case-sensitive="true" attribute on individual <qti-value> elements.
      const valueEls = answers.map(a => {
        const valueEl = buildXmlNode({ tag: 'qti-value', children: [a.value] });
        if (a.caseSensitive) {
          valueEl.setAttribute('case-sensitive', 'true');
        }
        return valueEl;
      });
      const correctResponseEl = buildXmlNode({
        tag: 'qti-correct-response',
        children: valueEls,
      });
      declaration.getXML().appendChild(correctResponseEl);
    } else {
      // Numeric: delegate to CorrectResponse (no per-value attrs needed).
      new CorrectResponse(
        answers.map(a => a.value),
        declaration,
      );
    }
  }

  const declarationXml = serializer.serializeToString(declaration.getXML());
  return { bodyXml, responseDeclarations: [declarationXml] };
}
