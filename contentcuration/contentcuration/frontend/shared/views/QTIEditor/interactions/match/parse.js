import { QTIDeclaration } from '../../serialization/qti/QTIDeclaration';
import { getPromptHTML, parseXML } from '../../serialization/xml';
import { buildXmlNode } from '../../serialization/assembleItem';
import CorrectResponse from '../../serialization/qti/declarations/correctResponse';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { hasRichTextContent, richTextComparisonKey } from '../../utils/richText';
import { RESPONSE_IDENTIFIER } from '../../constants';

const serializer = new XMLSerializer();

/**
 * @typedef {object} MatchChoice
 * @property {string} id      - QTI identifier, e.g. "choice_xlqTuVoq"
 * @property {string} content - HTML content of the <qti-simple-associable-choice>
 */

/**
 * @typedef {object} MatchRow
 * @property {string}        id       - QTI identifier of the row's first-set choice
 * @property {string}        content  - HTML content of the row prompt
 * @property {MatchChoice[]} matches  - Second-set choices this row is correctly matched to
 */

/**
 * @typedef {object} MatchState
 * @property {string}        responseIdentifier - Response identifier attribute
 * @property {string}        prompt             - HTML content of <qti-prompt>; default ""
 * @property {MatchRow[]}    rows               - Matching rows, in authored order
 * @property {MatchChoice[]} distractors        - Response-set choices matched by no row
 */

/**
 * @param {string} [content]
 * @returns {MatchChoice}
 */
export const newChoice = (content = '') => ({ id: generateRandomSlug('choice'), content });

/**
 * @returns {MatchRow}
 */
export const newRow = () => ({
  id: generateRandomSlug('row'),
  content: '',
  matches: [newChoice()],
});

/**
 * @returns {MatchState}
 */
export function _defaultState() {
  return {
    responseIdentifier: RESPONSE_IDENTIFIER,
    prompt: '',
    rows: [newRow()],
    distractors: [],
  };
}

/**
 * The row set and the response set. Any other count is not an item this editor can author.
 *
 * @param {Element} el - <qti-match-interaction> element
 * @returns {boolean}
 */
export function hasTwoMatchSets(el) {
  return el.querySelectorAll(':scope > qti-simple-match-set').length === 2;
}

/**
 * Extract the correct response from a declaration string as [rowId, responseId] couples.
 * An empty <qti-value/> coerces to null and is dropped.
 *
 * @param {string[]} declarations
 * @returns {Array<string[]>}
 */
function extractCorrectPairIds(declarations) {
  const [declXml] = declarations || [];
  if (!declXml) return [];

  try {
    const declaration = QTIDeclaration.fromXML(parseXML(declXml).documentElement);
    return (declaration.correctResponse ?? []).filter(Array.isArray);
  } catch {
    return [];
  }
}

/**
 * @param {Element} setEl - <qti-simple-match-set>
 * @param {string} prefix - slug prefix for a choice without an identifier
 * @returns {MatchChoice[]}
 */
function readSet(setEl, prefix) {
  return [...setEl.querySelectorAll('qti-simple-associable-choice')].map(el => ({
    id: el.getAttribute('identifier') || generateRandomSlug(prefix),
    content: el.innerHTML,
  }));
}

/**
 * Parse <qti-match-interaction> body XML + response declarations → MatchState.
 *
 * match-max is never read: a response is an answer exactly when a correct-response
 * value names it, and a distractor otherwise.
 *
 * @param {string} bodyXml
 * @param {string[]} responseDeclarations
 * @returns {MatchState}
 */
export function parseMatchInteraction(bodyXml, responseDeclarations) {
  if (!bodyXml) return _defaultState();

  let root;
  try {
    root = parseXML(bodyXml).documentElement;
  } catch {
    return _defaultState();
  }
  if (!hasTwoMatchSets(root)) return _defaultState();

  const [rowSet, responseSet] = root.querySelectorAll(':scope > qti-simple-match-set');
  const rows = readSet(rowSet, 'row').map(row => ({ ...row, matches: [] }));
  const responses = readSet(responseSet, 'choice');
  const rowById = new Map(rows.map(row => [row.id, row]));
  const responseById = new Map(responses.map(response => [response.id, response]));

  const matched = new Set();
  for (const [rowId, responseId] of extractCorrectPairIds(responseDeclarations)) {
    const row = rowById.get(rowId);
    const response = responseById.get(responseId);
    if (row && response) {
      row.matches.push({ ...response });
      matched.add(response);
    }
  }

  return {
    responseIdentifier: root.getAttribute('response-identifier') || RESPONSE_IDENTIFIER,
    prompt: getPromptHTML(root),
    rows,
    distractors: responses.filter(response => !matched.has(response)),
  };
}

/**
 * Serialize MatchState → { bodyXml, responseDeclarations }.
 *
 * @param {MatchState} state
 * @param {string} _questionType - unused (match has one question type); kept for API parity
 * @param {object} declarationSchema - { baseType: string, cardinality: string }
 * @returns {{ bodyXml: string, responseDeclarations: string[] }}
 */
export function buildMatchInteractionXML(state, _questionType, declarationSchema) {
  const { responseIdentifier = RESPONSE_IDENTIFIER, prompt, rows = [], distractors = [] } = state;

  // Ids are unique across both match sets; the first appearance keeps its id.
  const usedIds = new Set();
  function claim(id, prefix) {
    const resolved = id && !usedIds.has(id) ? id : generateRandomSlug(prefix);
    usedIds.add(resolved);
    return resolved;
  }

  // Rows and distractors are never merged, so any repeat of their id is a conflict.
  const rowIds = rows.map(row => claim(row.id, 'row'));

  // Answers of equal content are one choice, serving every row that names it;
  // blanks never are.
  const idByAnswerKey = new Map();
  const answers = new Map();
  const correctPairs = [];
  rows.forEach((row, index) => {
    for (const { id, content } of row.matches) {
      const key = hasRichTextContent(content) ? richTextComparisonKey(content) : '';
      const resolved = (key && idByAnswerKey.get(key)) || claim(id, 'choice');
      if (key) idByAnswerKey.set(key, resolved);

      const answer = answers.get(resolved);
      if (answer) {
        answer.matchMax += 1;
      } else {
        answers.set(resolved, { id: resolved, content, matchMax: 1 });
      }
      correctPairs.push([rowIds[index], resolved]);
    }
  });

  const distractorChoices = distractors.map(({ id, content }) => ({
    id: claim(id, 'choice'),
    content,
    matchMax: 1,
  }));

  const choiceNode = ({ id, content, matchMax }) =>
    buildXmlNode({
      tag: 'qti-simple-associable-choice',
      attrs: { identifier: id, 'match-max': matchMax },
      innerHTML: content,
    });

  const rowSet = buildXmlNode({
    tag: 'qti-simple-match-set',
    children: rows.map(({ content, matches }, index) =>
      choiceNode({ id: rowIds[index], content, matchMax: Math.max(matches.length, 1) }),
    ),
  });
  const responseSet = buildXmlNode({
    tag: 'qti-simple-match-set',
    children: [...answers.values(), ...distractorChoices].map(choiceNode),
  });

  const children = [];
  if (prompt) {
    children.push(buildXmlNode({ tag: 'qti-prompt', innerHTML: prompt }));
  }
  children.push(rowSet, responseSet);

  const interactionEl = buildXmlNode({
    tag: 'qti-match-interaction',
    attrs: {
      'response-identifier': responseIdentifier,
      shuffle: 'true',
      'max-associations': correctPairs.length,
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
  if (correctPairs.length > 0) {
    new CorrectResponse(correctPairs, declaration);
  }

  return {
    bodyXml: serializer.serializeToString(interactionEl),
    responseDeclarations: [serializer.serializeToString(declaration.getXML())],
  };
}
