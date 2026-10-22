import { QTIDeclaration } from '../../serialization/qti/QTIDeclaration';
import CorrectResponse from '../../serialization/qti/declarations/correctResponse';
import {
  buildXmlNode,
  getContentHTML,
  getPromptHTML,
  isContentNode,
  parseXML,
  serializeAsHtml,
  wrapInlineRuns,
} from '../../serialization/xml';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { hasRichTextContent } from '../../utils/richText';
import { RESPONSE_IDENTIFIER, SENTINEL_MARKER } from '../../constants';
import { _extractCorrectPairIds } from '../associate/parse';
import { richTextComparisonKey } from 'shared/views/TipTapEditor/TipTapEditor/utils/comparisonKey';

const serializer = new XMLSerializer();

const GAP = 'qti-gap';
const GAP_TEXT = 'qti-gap-text';
const PROMPT = 'qti-prompt';
const CORRECT_ATTR = 'data-studio-correct';
const SENTINEL_ID = 'studio_sentinel';

function defaultState() {
  return { responseIdentifier: RESPONSE_IDENTIFIER, prompt: '', passage: '', distractors: [] };
}

export function getGaps(passage) {
  const doc = parseXML(passage || '', 'text/html');
  return [...doc.querySelectorAll(GAP)].map(el => ({
    id: el.getAttribute('identifier'),
    answerId: el.getAttribute(CORRECT_ATTR),
    answer: getContentHTML(el),
  }));
}

export function parseGapMatchInteraction(bodyXml, responseDeclarations) {
  if (!bodyXml) return defaultState();

  let root;
  try {
    root = parseXML(bodyXml).documentElement;
  } catch {
    return defaultState();
  }

  const contentNodes = [...root.childNodes].filter(isContentNode);
  const gapTextEls = contentNodes.filter(
    node => node.localName === GAP_TEXT && !node.hasAttribute(SENTINEL_MARKER),
  );
  const passageNodes = contentNodes.filter(node => ![GAP_TEXT, PROMPT].includes(node.localName));
  const isEmptyParagraph =
    passageNodes.length === 1 &&
    passageNodes[0].localName === 'p' &&
    !passageNodes[0].hasChildNodes();

  const gapTextById = new Map();
  for (const el of gapTextEls) {
    if (!el.getAttribute('identifier')) {
      el.setAttribute('identifier', generateRandomSlug('choice'));
    }
    const id = el.getAttribute('identifier');
    if (!gapTextById.has(id)) gapTextById.set(id, el);
  }

  const answerIdByGapId = new Map();
  for (const [gapTextId, gapId] of _extractCorrectPairIds(responseDeclarations).filter(Boolean)) {
    if (gapTextById.has(gapTextId) && !answerIdByGapId.has(gapId)) {
      answerIdByGapId.set(gapId, gapTextId);
    }
  }

  const paired = new Set();
  for (const gapEl of root.querySelectorAll(GAP)) {
    const originalId = gapEl.getAttribute('identifier');
    if (!originalId) gapEl.setAttribute('identifier', generateRandomSlug('gap'));

    const gapTextEl = gapTextById.get(answerIdByGapId.get(originalId));
    if (gapTextEl) {
      gapEl.setAttribute(CORRECT_ATTR, gapTextEl.getAttribute('identifier'));
      gapEl.append(...[...gapTextEl.childNodes].map(node => node.cloneNode(true)));
      paired.add(gapTextEl);
    }
  }

  return {
    responseIdentifier: root.getAttribute('response-identifier') || RESPONSE_IDENTIFIER,
    prompt: getPromptHTML(root),
    passage: isEmptyParagraph ? '' : serializeAsHtml(passageNodes, root.namespaceURI),
    distractors: gapTextEls
      .filter(el => !paired.has(el))
      .map(el => ({ id: el.getAttribute('identifier'), content: getContentHTML(el) })),
  };
}

export function buildGapMatchInteractionXML(state, _questionType, declarationSchema) {
  const { responseIdentifier = RESPONSE_IDENTIFIER, prompt, passage, distractors = [] } = state;

  const passageEl = buildXmlNode({ tag: 'div', innerHTML: passage || '' });
  const gapEls = [...passageEl.querySelectorAll(GAP)];

  const taken = new Set(
    [
      ...gapEls.flatMap(el => [el.getAttribute('identifier'), el.getAttribute(CORRECT_ATTR)]),
      ...distractors.map(({ id }) => id),
    ].filter(Boolean),
  );
  const claimed = new Set();
  function nextFree(base) {
    let n = 2;
    while (taken.has(`${base}_${n}`)) n++;
    return `${base}_${n}`;
  }
  function claim(resolved) {
    claimed.add(resolved);
    taken.add(resolved);
    return resolved;
  }
  function claimExisting(id, prefix) {
    if (!id) return claim(generateRandomSlug(prefix));
    return claim(claimed.has(id) ? nextFree(id) : id);
  }
  function claimDerived(base) {
    return claim(taken.has(base) ? nextFree(base) : base);
  }

  const idByAnswerKey = new Map();
  const answers = new Map();
  const correctPairs = [];
  for (const gapEl of gapEls) {
    const gapId = claimExisting(gapEl.getAttribute('identifier'), 'gap');
    const content = getContentHTML(gapEl);
    if (hasRichTextContent(content)) {
      const key = richTextComparisonKey(content);
      const ownAnswerId = gapEl.getAttribute(CORRECT_ATTR);
      const answerId =
        idByAnswerKey.get(key) ||
        (ownAnswerId
          ? claimExisting(ownAnswerId, 'choice')
          : claimDerived(`choice_${gapId.replace(/^gap_/, '')}`));
      idByAnswerKey.set(key, answerId);

      const answer = answers.get(answerId);
      if (answer) {
        answer.matchMax += 1;
      } else {
        answers.set(answerId, { id: answerId, content, matchMax: 1 });
      }
      correctPairs.push([answerId, gapId]);
    }

    gapEl.textContent = '';
    for (const name of gapEl.getAttributeNames()) gapEl.removeAttribute(name);
    gapEl.setAttribute('identifier', gapId);
  }

  const distractorChoices = distractors.map(({ id, content }) => ({
    id: claimExisting(id, 'choice'),
    content,
    matchMax: 1,
  }));

  const children = [];
  if (hasRichTextContent(prompt)) {
    children.push(buildXmlNode({ tag: PROMPT, innerHTML: prompt }));
  }
  for (const { id, content, matchMax } of [...answers.values(), ...distractorChoices]) {
    children.push(
      buildXmlNode({
        tag: GAP_TEXT,
        attrs: { identifier: id, 'match-max': matchMax },
        innerHTML: content,
      }),
    );
  }
  if (!answers.size && !distractorChoices.length) {
    children.push(
      buildXmlNode({
        tag: GAP_TEXT,
        attrs: { identifier: SENTINEL_ID, 'match-max': 1, [SENTINEL_MARKER]: '' },
        innerHTML: SENTINEL_ID,
      }),
    );
  }
  const passageBlocks = wrapInlineRuns(passageEl, 'p');
  children.push(...(passageBlocks.length ? passageBlocks : [buildXmlNode({ tag: 'p' })]));

  const interactionEl = buildXmlNode({
    tag: 'qti-gap-match-interaction',
    attrs: {
      'response-identifier': responseIdentifier,
      shuffle: 'true',
      'max-associations': gapEls.length,
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
