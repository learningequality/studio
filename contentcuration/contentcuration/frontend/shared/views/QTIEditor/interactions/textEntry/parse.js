import { QTIDeclaration } from '../../serialization/qti/QTIDeclaration';
import { parseXML } from '../../serialization/parseItem';
import { buildXmlNode } from '../../serialization/assembleItem';
import CorrectResponse from '../../serialization/qti/declarations/correctResponse';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { BaseType } from '../../constants';

const serializer = new XMLSerializer();

const RESPONSE_IDENTIFIER = 'RESPONSE';

/**
 * Default `expected-length` attribute written on `<qti-text-entry-interaction>`
 * for free-response items. The QTI 3.0 spec does not mandate a value; 50 is a
 * widely-used authoring convention (sourced from the textEntry interaction PR
 * description). Change this constant if your platform uses a different default.
 *
 * This attribute is informational — it hints to the player how wide to render
 * the input box. It has no effect on scoring.
 */
export const FREE_RESPONSE_EXPECTED_LENGTH = 50;

/**
 * Default state — used when bodyXml is absent or unparseable.
 *
 * @returns {TextEntryState}
 */
export function _defaultState() {
  return {
    prompt: '',
    answers: [],
    expectedLength: 0,
  };
}

/**
 * Serialize body children to an HTML string, excluding the element that
 * directly contains the `<qti-text-entry-interaction>`.
 *
 * buildTextEntryInteractionXML wraps body content in a single `<div>`, so we
 * look inside that wrapper for prompt children and the interaction container.
 *
 * @param {Element} bodyEl - The `<qti-item-body>` element
 * @returns {string}
 */
export function _extractPromptHTML(bodyEl) {
  const interactionEl = bodyEl.querySelector('qti-text-entry-interaction');
  if (!interactionEl) return '';

  // The interaction sits in a <p>; the <p> itself (or the interaction) is the
  // container we want to exclude.
  const interactionContainer = interactionEl.parentElement;

  // buildTextEntryInteractionXML wraps everything in a single outer <div>.
  // If the body has exactly one <div> child, iterate its children so we
  // exclude only the <p> holding the interaction rather than the entire wrapper.
  const bodyChildren = bodyEl.children;
  const searchRoot =
    bodyChildren.length === 1 && bodyChildren[0].tagName.toLowerCase() === 'div'
      ? bodyChildren[0]
      : bodyEl;

  const parts = [];
  for (const child of searchRoot.childNodes) {
    if (child === interactionContainer || child === interactionEl) continue;
    parts.push(
      child.nodeType === Node.TEXT_NODE ? child.textContent : serializer.serializeToString(child),
    );
  }
  return parts.join('').trim();
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

    if (!isFloat && !isString) return [];

    const correctResponseEl = declEl.querySelector('qti-correct-response');
    if (!correctResponseEl) return [];

    const valueEls = [...correctResponseEl.querySelectorAll('qti-value')];
    if (valueEls.length === 0) return [];

    return valueEls.map(el => ({
      id: generateRandomSlug('answer'),
      value: el.textContent.trim(),
      // case-sensitive is only meaningful for string base-type answers.
      caseSensitive: isString && el.getAttribute('case-sensitive') === 'true',
    }));
  } catch {
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
    const doc = parseXML(bodyXml, 'text/html');
    // bodyXml may be the <qti-item-body> itself or wrap it — handle both.
    bodyEl =
      doc.body.firstElementChild &&
      doc.body.firstElementChild.tagName.toLowerCase() === 'qti-item-body'
        ? doc.body.firstElementChild
        : (doc.querySelector('qti-item-body') ?? doc.body.firstElementChild ?? doc.body);
  } catch {
    return _defaultState();
  }

  const interactionEl = bodyEl.querySelector('qti-text-entry-interaction');
  if (!interactionEl) return _defaultState();

  const expectedLength = parseInt(interactionEl.getAttribute('expected-length') ?? '0', 10);
  const prompt = _extractPromptHTML(bodyEl);
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

  // Only freeResponse has an expected-length; textEntry and numeric do not.
  const isFreeResponse = baseType === BaseType.STRING && answers.length === 0;

  const interactionAttrs = {
    'response-identifier': RESPONSE_IDENTIFIER,
  };

  const effectiveExpectedLength = isFreeResponse
    ? FREE_RESPONSE_EXPECTED_LENGTH
    : expectedLength || null;
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
    divChildren.push(buildXmlNode({ tag: 'div', innerHTML: prompt }));
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
