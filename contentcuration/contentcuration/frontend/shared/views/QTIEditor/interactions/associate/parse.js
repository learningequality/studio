import flatMap from 'lodash/flatMap';
import flatten from 'lodash/flatten';
import { QTIDeclaration } from '../../serialization/qti/QTIDeclaration';
import { getPromptHTML, parseXML } from '../../serialization/parseItem';
import { buildXmlNode } from '../../serialization/assembleItem';
import CorrectResponse from '../../serialization/qti/declarations/correctResponse';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { stripTags } from '../../utils/stripTags';
import { RESPONSE_IDENTIFIER } from '../../constants';

const serializer = new XMLSerializer();

/**
 * @typedef {object} AssociateChoice
 * @property {string} id      - QTI identifier, e.g. "choice_xlqTuVoq"
 * @property {string} content - HTML content of the <qti-simple-associable-choice>
 */

/**
 * @typedef {object} AssociateState
 * @property {string}            responseIdentifier - Response identifier attribute
 * @property {string}            prompt             - HTML content of <qti-prompt>; default ""
 * @property {AssociateChoice[]} distractors        - Flat pool of unpaired choices
 * @property {Array<[AssociateChoice, AssociateChoice]>} pairs - Correctly associated pairs
 */

const blankChoice = () => ({ id: generateRandomSlug('choice'), content: '' });

/**
 * @returns {AssociateState}
 */
export function _defaultState() {
  return {
    responseIdentifier: RESPONSE_IDENTIFIER,
    prompt: '',
    distractors: [],
    pairs: [[blankChoice(), blankChoice()]],
  };
}

/**
 * Extract the correct pairs from a response declaration string as id couples.
 *
 * An empty <qti-value/> coerces to null and is kept as such: it stands for a
 * pair the author has yet to fill in, which the editor shows as a blank pair.
 *
 * @param {string[]} declarations
 * @returns {Array<string[]|null>}
 */
export function _extractCorrectPairIds(declarations) {
  const [declXml] = declarations || [];
  if (!declXml) return [];

  try {
    const declEl = parseXML(declXml).documentElement;
    const declaration = QTIDeclaration.fromXML(declEl);
    return (declaration.correctResponse ?? []).map(value => (Array.isArray(value) ? value : null));
  } catch {
    return [];
  }
}

/**
 * Parse <qti-associate-interaction> body XML + response declarations → AssociateState.
 *
 * @param {string} bodyXml
 * @param {string[]} responseDeclarations
 * @returns {AssociateState}
 */
export function parseAssociateInteraction(bodyXml, responseDeclarations) {
  if (!bodyXml) return _defaultState();

  let root;
  try {
    root = parseXML(bodyXml).documentElement;
  } catch {
    return _defaultState();
  }

  const pool = [...root.querySelectorAll('qti-simple-associable-choice')].map(el => ({
    id: el.getAttribute('identifier') || generateRandomSlug('choice'),
    content: el.innerHTML,
    matchMax: parseInt(el.getAttribute('match-max'), 10) || 1,
  }));
  const poolById = new Map(pool.map(choice => [choice.id, choice]));

  const pairs = _extractCorrectPairIds(responseDeclarations)
    .map(ids => (ids ? ids.map(id => poolById.get(id)) : [blankChoice(), blankChoice()]))
    .filter(members => members.every(Boolean))
    .map(members => members.map(({ id, content }) => ({ id, content })));

  // match-max is how many pairs a choice may join; the capacity the correct
  // response leaves unused is what the author added as a loose option.
  const pairedCount = new Map();
  for (const { id } of flatten(pairs)) {
    pairedCount.set(id, (pairedCount.get(id) || 0) + 1);
  }

  const distractors = flatMap(pool, ({ id, content, matchMax }) =>
    Array.from({ length: Math.max(matchMax - (pairedCount.get(id) || 0), 0) }, () => ({
      id,
      content,
    })),
  );

  return {
    responseIdentifier: root.getAttribute('response-identifier') || RESPONSE_IDENTIFIER,
    prompt: getPromptHTML(root),
    distractors,
    pairs,
  };
}

/**
 * Serialize AssociateState → { bodyXml, responseDeclarations }.
 *
 * @param {AssociateState} state
 * @param {string} _questionType - unused (associate has one question type); kept for API parity
 * @param {object} declarationSchema - { baseType: string, cardinality: string }
 * @returns {{ bodyXml: string, responseDeclarations: string[] }}
 */
export function buildAssociateInteractionXML(state, _questionType, declarationSchema) {
  const { responseIdentifier = RESPONSE_IDENTIFIER, prompt, pairs = [], distractors = [] } = state;

  const idByContent = new Map();
  const contentById = new Map();

  // Preserves the id a choice already carries unless it is already bound to
  // different content.
  function resolveChoice({ id, content }) {
    const key = stripTags(content).trim();

    // Blank choices are never deduped — a freshly added pair holds two of them,
    // and collapsing them would leave the pair unable to round-trip.
    if (key && idByContent.has(key)) {
      return { id: idByContent.get(key), content };
    }

    const boundKey = contentById.get(id);
    const resolvedId =
      boundKey === undefined || boundKey === key ? id : generateRandomSlug('choice');
    contentById.set(resolvedId, key);
    if (key) {
      idByContent.set(key, resolvedId);
    }
    return { id: resolvedId, content };
  }

  const resolvedPairs = pairs.map(pair => pair.map(resolveChoice));
  const resolvedDistractors = distractors.map(resolveChoice);

  // Every appearance of a choice is one pairing it may take part in.
  const pool = new Map();
  for (const { id, content } of [...flatten(resolvedPairs), ...resolvedDistractors]) {
    const entry = pool.get(id);
    if (entry) {
      entry.matchMax += 1;
    } else {
      pool.set(id, { id, content, matchMax: 1 });
    }
  }

  const children = [];
  if (prompt) {
    children.push(buildXmlNode({ tag: 'qti-prompt', innerHTML: prompt }));
  }
  for (const { id, content, matchMax } of pool.values()) {
    children.push(
      buildXmlNode({
        tag: 'qti-simple-associable-choice',
        attrs: { identifier: id, 'match-max': matchMax },
        innerHTML: content,
      }),
    );
  }

  const interactionEl = buildXmlNode({
    tag: 'qti-associate-interaction',
    attrs: {
      'response-identifier': responseIdentifier,
      shuffle: 'true',
      'max-associations': pairs.length,
    },
    children,
  });

  const { cardinality, baseType } = declarationSchema;
  const declaration = new QTIDeclaration({
    identifier: responseIdentifier,
    baseType,
    cardinality,
    tag: 'qti-response-declaration',
  });
  if (resolvedPairs.length > 0) {
    new CorrectResponse(
      resolvedPairs.map(pair => pair.map(choice => choice.id)),
      declaration,
    );
  }

  return {
    bodyXml: serializer.serializeToString(interactionEl),
    responseDeclarations: [serializer.serializeToString(declaration.getXML())],
  };
}
