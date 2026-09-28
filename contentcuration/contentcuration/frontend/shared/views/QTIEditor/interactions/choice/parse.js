import { QTIDeclaration } from '../../serialization/qti/QTIDeclaration';
import { getPromptHTML, parseXML } from '../../serialization/xml';
import { buildXmlNode } from '../../serialization/assembleItem';
import CorrectResponse from '../../serialization/qti/declarations/correctResponse';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { Orientation, QuestionType, RESPONSE_IDENTIFIER } from '../../constants';

/**
 * @typedef {object} ChoiceAnswer
 * @property {string}  id       - QTI identifier, e.g. "choice_xlqTuVoq"
 * @property {string}  content  - HTML content of the <qti-simple-choice>
 * @property {boolean} correct  - Whether this choice is in the correct response
 * @property {boolean} fixed    - Whether this choice is fixed (round-trip only)
 */

/**
 * @typedef {object} ChoiceState
 * @property {string}        prompt          - HTML content of <qti-prompt>; default ""
 * @property {ChoiceAnswer[]} choices
 * @property {boolean}       showAnswerCount - true unless max-choices="0" in the source XML
 * @property {boolean}       shuffle         - From shuffle attribute; default false
 * @property {string}        orientation     - From orientation attribute; default "vertical"
 */

const serializer = new XMLSerializer();

export function _defaultState() {
  return {
    responseIdentifier: RESPONSE_IDENTIFIER,
    prompt: '',
    choices: [{ id: generateRandomSlug('choice'), content: '', correct: false }],
    showAnswerCount: true,
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
  const shuffle = root.getAttribute('shuffle') === 'true';
  const orientation = root.getAttribute('orientation') ?? Orientation.VERTICAL;
  const prompt = getPromptHTML(root);
  const showAnswerCount = root.getAttribute('max-choices') !== '0';

  const correctIds = _extractCorrectIds(responseDeclarations);

  const choices = [...root.querySelectorAll('qti-simple-choice')].map(el => ({
    id: el.getAttribute('identifier') || generateRandomSlug('choice'),
    content: el.innerHTML,
    correct: correctIds.has(el.getAttribute('identifier') ?? ''),
    fixed: el.getAttribute('fixed') === 'true',
  }));

  return {
    responseIdentifier,
    prompt,
    choices,
    showAnswerCount,
    shuffle,
    orientation,
  };
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
    showAnswerCount = true,
    shuffle,
    orientation,
  } = state;

  const correctCount = choices.filter(c => c.correct).length;

  let maxChoicesAttr;
  let minChoicesAttr;
  if (questionType === QuestionType.SINGLE_SELECT) {
    maxChoicesAttr = 1;
  } else if (!showAnswerCount) {
    maxChoicesAttr = 0;
  } else {
    maxChoicesAttr = correctCount;
    minChoicesAttr = correctCount;
  }

  const attrs = {
    'response-identifier': responseIdentifier,
    'max-choices': maxChoicesAttr,
    shuffle: String(shuffle),
    orientation,
  };
  if (minChoicesAttr > 0) attrs['min-choices'] = minChoicesAttr;

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
