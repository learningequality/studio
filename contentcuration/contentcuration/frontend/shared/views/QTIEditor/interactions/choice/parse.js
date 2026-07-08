import { QTIDeclaration } from '../../serialization/qti/QTIDeclaration';
import { parseXML, getPromptHTML } from '../../serialization/parseItem';
import { buildXmlNode } from '../../serialization/assembleItem';
import CorrectResponse from '../../serialization/qti/declarations/correctResponse';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { Orientation } from '../../constants';

const serializer = new XMLSerializer();
const RESPONSE_IDENTIFIER = 'RESPONSE';

export function _defaultState() {
  return {
    prompt: '',
    choices: [],
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

  return { prompt, choices, maxChoices, minChoices, shuffle, orientation };
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
  const { prompt, choices, maxChoices, minChoices, shuffle, orientation } = state;

  const attrs = {
    'response-identifier': RESPONSE_IDENTIFIER,
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
    identifier: RESPONSE_IDENTIFIER,
    baseType,
    cardinality,
    tag: 'qti-response-declaration',
  });
  const correctIds = choices.filter(a => a.correct).map(a => a.id);
  new CorrectResponse(correctIds, declaration);

  const declarationXml = serializer.serializeToString(declaration.getXML());
  return { bodyXml, responseDeclarations: [declarationXml] };
}

/**
 * Strips HTML tags from a string.
 * @param {string} html
 * @returns {string}
 */
export function stripTags(html) {
  return (html ?? '').replace(/<[^>]*>/g, '');
}
