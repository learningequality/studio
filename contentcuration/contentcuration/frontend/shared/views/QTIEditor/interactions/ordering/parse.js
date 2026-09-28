import { QTIDeclaration } from '../../serialization/qti/QTIDeclaration';
import { getPromptHTML, parseXML } from '../../serialization/xml';
import { buildXmlNode } from '../../serialization/assembleItem';
import CorrectResponse from '../../serialization/qti/declarations/correctResponse';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { Orientation, RESPONSE_IDENTIFIER } from '../../constants';

/**
 * @typedef {object} OrderingItem
 * @property {string}  id      - QTI identifier, e.g. "order_xlqTuVoq"
 * @property {string}  content - HTML content of the <qti-simple-choice>
 * @property {boolean} fixed   - Whether this item is fixed in place
 *                              (round-trip only; not editable in UI)
 */

/**
 * @typedef {object} OrderingState
 * @property {string}           responseIdentifier - Response identifier attribute
 * @property {string}           prompt             - HTML content of <qti-prompt>; default ""
 * @property {OrderingItem[]}   items              - Items in the CORRECT order
 * @property {string}           orientation        - From orientation attribute; default "vertical"
 * @property {boolean}          shuffle            - From shuffle attribute;
 *                                                   default true for new items
 */

const serializer = new XMLSerializer();

export function _defaultState() {
  return {
    responseIdentifier: RESPONSE_IDENTIFIER,
    prompt: '',
    items: [{ id: generateRandomSlug('order'), content: '' }],
    orientation: Orientation.VERTICAL,
    shuffle: true,
  };
}

/**
 * Extract the ordered list of correct identifiers from a response declaration string.
 * Returns an array (ordered) rather than a Set.
 *
 * @param {string[]} declarations
 * @returns {string[]}
 */
export function _extractOrderedCorrectIds(declarations) {
  const [declXml] = declarations || [];
  if (!declXml) return [];

  try {
    const declEl = parseXML(declXml).documentElement;
    const declaration = QTIDeclaration.fromXML(declEl);
    const correct = declaration.correctResponse;
    return correct ? [...correct] : [];
  } catch {
    return [];
  }
}

/**
 * Parse <qti-order-interaction> body XML + response declarations → OrderingState.
 *
 * @param {string} bodyXml
 * @param {string[]} responseDeclarations
 * @returns {object} OrderingState
 */
export function parseOrderingInteraction(bodyXml, responseDeclarations) {
  if (!bodyXml) return _defaultState();

  let root;
  try {
    root = parseXML(bodyXml).documentElement;
  } catch {
    return _defaultState();
  }

  const responseIdentifier = root.getAttribute('response-identifier') || RESPONSE_IDENTIFIER;
  const orientation = root.getAttribute('orientation') ?? Orientation.VERTICAL;
  const shuffle = root.getAttribute('shuffle') === 'true';
  const prompt = getPromptHTML(root);

  const rawItems = [...root.querySelectorAll('qti-simple-choice')].map(el => ({
    id: el.getAttribute('identifier') || generateRandomSlug('order'),
    content: el.innerHTML,
    fixed: el.getAttribute('fixed') === 'true',
  }));

  const correctOrder = _extractOrderedCorrectIds(responseDeclarations);

  let items;
  if (correctOrder.length > 0) {
    const itemById = Object.fromEntries(rawItems.map(item => [item.id, item]));
    const ordered = correctOrder.map(id => itemById[id]).filter(Boolean);
    const declaredIds = new Set(correctOrder);
    const remainder = rawItems.filter(item => !declaredIds.has(item.id));
    items = [...ordered, ...remainder];
  } else {
    items = rawItems;
  }

  return {
    responseIdentifier,
    prompt,
    items,
    orientation,
    shuffle,
  };
}

/**
 * Serialize OrderingState → { bodyXml, responseDeclarations }.
 *
 * @param {object} state - OrderingState
 * @param {string} _questionType - unused (ordering has only one question type); kept for API parity
 * @param {object} declarationSchema - { baseType: string, cardinality: string }
 * @returns {{ bodyXml: string, responseDeclarations: string[] }}
 */
export function buildOrderingInteractionXML(state, _questionType, declarationSchema) {
  const { responseIdentifier = RESPONSE_IDENTIFIER, prompt, items, orientation, shuffle } = state;

  const attrs = {
    'response-identifier': responseIdentifier,
    orientation,
    shuffle: String(shuffle),
  };

  const children = [];

  if (prompt) {
    children.push(buildXmlNode({ tag: 'qti-prompt', innerHTML: prompt }));
  }

  for (const item of items) {
    const itemAttrs = { identifier: item.id };
    if (item.fixed) itemAttrs.fixed = 'true';
    children.push(
      buildXmlNode({
        tag: 'qti-simple-choice',
        attrs: itemAttrs,
        innerHTML: item.content,
      }),
    );
  }

  const interactionEl = buildXmlNode({ tag: 'qti-order-interaction', attrs, children });
  const bodyXml = serializer.serializeToString(interactionEl);

  const { cardinality, baseType } = declarationSchema;
  const declaration = new QTIDeclaration({
    identifier: responseIdentifier,
    baseType,
    cardinality,
    tag: 'qti-response-declaration',
  });
  const correctIds = items.map(item => item.id);
  if (correctIds.length > 0) {
    new CorrectResponse(correctIds, declaration);
  }

  const declarationXml = serializer.serializeToString(declaration.getXML());
  return { bodyXml, responseDeclarations: [declarationXml] };
}
