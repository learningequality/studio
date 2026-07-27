import { QTIDeclaration } from '../../serialization/qti/QTIDeclaration';
import { getPromptHTML, parseXML } from '../../serialization/parseItem';
import { buildXmlNode } from '../../serialization/assembleItem';
import CorrectResponse from '../../serialization/qti/declarations/correctResponse';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { Orientation, RESPONSE_IDENTIFIER } from '../../constants';

/**
 * @typedef {object} ChoiceAnswer
 * @property {string}  id       - QTI identifier, e.g. "choice_xlqTuVoq"
 * @property {string}  content  - HTML content of the <qti-simple-choice>
 * @property {boolean} correct  - Whether this choice is in the correct response
 * @property {boolean} fixed    - Whether this choice is fixed (round-trip only)
 */

/**
 * @typedef {object} ChoiceState
 * @property {string}        prompt      - HTML content of <qti-prompt>; default ""
 * @property {ChoiceAnswer[]} answers
 * @property {number}        maxChoices  - From max-choices attribute (0 = unlimited)
 * @property {number}        minChoices  - From min-choices attribute; default 0
 * @property {boolean}       shuffle     - From shuffle attribute; default false
 * @property {string}        orientation - From orientation attribute; default "vertical"
 */

const serializer = new XMLSerializer();

export function _defaultState() {
  return {
    responseIdentifier: RESPONSE_IDENTIFIER,
    prompt: '',
    choices: [{ id: generateRandomSlug('choice'), content: '', correct: false }],
    maxChoices: 1,
    minChoices: 0,
    shuffle: false,
    orientation: Orientation.VERTICAL,
  };
}

export function _extractCorrectIds(declarations) {
  const ids = new Set();
  const [declXml] = declarations || [];
  if (!declXml) return ids;

  try {
    const declEl = parseXML(declXml).documentElement;
    const declaration = QTIDeclaration.fromXML(declEl);
    const correct = declaration.correctResponse;
    if (correct) {
      for (const id of correct) ids.add(id);
    }
  } catch {
    // Ignore parse errors
  }
  return ids;
}

export function _parseHtmlFragment(html) {
  if (!html) return [];
  if (!html.includes('<')) return [html];
  try {
    const fragment = parseXML(`<qti-fragment>${html}</qti-fragment>`);
    return [...fragment.documentElement.childNodes];
  } catch {
    return [html];
  }
}

/**
 * Parse <qti-choice-interaction> body XML + response declarations → ChoiceState.
 *
 * @param {string} bodyXml
 * @param {string[]} responseDeclarations
 * @returns {object} ChoiceState
 */
export function parseChoiceInteraction(bodyXml, responseDeclarations) {
  if (!bodyXml) return _defaultState();

  let root;
  try {
    root = parseXML(bodyXml).documentElement;
  } catch {
    return _defaultState();
  }

  const responseIdentifier = root.getAttribute('response-identifier') || RESPONSE_IDENTIFIER;
  const maxChoices = parseInt(root.getAttribute('max-choices') ?? '0', 10);
  const minChoices = parseInt(root.getAttribute('min-choices') ?? '0', 10);
  const shuffle = root.getAttribute('shuffle') === 'true';
  const orientation = root.getAttribute('orientation') ?? Orientation.VERTICAL;
  const prompt = getPromptHTML(root);

  const correctIds = _extractCorrectIds(responseDeclarations);

  const choices = [...root.querySelectorAll('qti-simple-choice')].map(el => ({
    id: el.getAttribute('identifier') || generateRandomSlug('choice'),
    content: el.innerHTML,
    correct: correctIds.has(el.getAttribute('identifier') ?? ''),
    fixed: el.getAttribute('fixed') === 'true',
  }));

  return { responseIdentifier, prompt, choices, maxChoices, minChoices, shuffle, orientation };
}

/**
 * Serialize ChoiceState → { bodyXml, declarations }.
 *
 * @param {object} state - ChoiceState
 * @param {string} questionType
 * @param {object} declarationSchema - { baseType: string, cardinality: string }
 * @returns {{ bodyXml: string, responseDeclarations: string[] }}
 */
export function buildChoiceInteractionXML(state, questionType, declarationSchema) {
  const {
    responseIdentifier = RESPONSE_IDENTIFIER,
    prompt,
    choices,
    maxChoices,
    minChoices,
    shuffle,
    orientation,
  } = state;

  const attrs = {
    'response-identifier': responseIdentifier,
    'max-choices': maxChoices,
    shuffle: String(shuffle),
    orientation,
  };
  if (minChoices > 0) attrs['min-choices'] = minChoices;

  const children = [];

  if (prompt) {
    children.push(buildXmlNode({ tag: 'qti-prompt', innerHTML: prompt }));
  }

  for (const choice of choices) {
    const choiceAttrs = { identifier: choice.id };
    if (choice.fixed) choiceAttrs.fixed = 'true';
    children.push(
      buildXmlNode({
        tag: 'qti-simple-choice',
        attrs: choiceAttrs,
        innerHTML: choice.content,
      }),
    );
  }

  const interactionEl = buildXmlNode({ tag: 'qti-choice-interaction', attrs, children });
  const bodyXml = serializer.serializeToString(interactionEl);

  const { cardinality, baseType } = declarationSchema;
  const declaration = new QTIDeclaration({
    identifier: responseIdentifier,
    baseType,
    cardinality,
    tag: 'qti-response-declaration',
  });
  const correctIds = choices.filter(a => a.correct).map(a => a.id);
  new CorrectResponse(correctIds, declaration);

  const declarationXml = serializer.serializeToString(declaration.getXML());
  return { bodyXml, responseDeclarations: [declarationXml] };
}
