import { QTIDeclaration } from '../../serialization/qti/QTIDeclaration';
import CorrectResponse from '../../serialization/qti/declarations/correctResponse';
import { buildXmlNode, parseXML, serializeAsHtml, wrapInlineRuns } from '../../serialization/xml';
import { generateRandomSlug } from '../../utils/generateRandomSlug';

const serializer = new XMLSerializer();

export const DROPDOWN = 'qti-inline-choice-interaction';
export const OPTION = 'qti-inline-choice';
const PROMPT_MARKER = 'data-studio-prompt';
const SENTINEL_MARKER = 'data-studio-sentinel';
export const CORRECT_ATTR = 'data-studio-correct';
const SENTINEL_ID = 'studio_sentinel';
const KEPT_DROPDOWN_ATTRS = ['response-identifier', CORRECT_ATTR];

/**
 * @typedef {object} InlineChoiceState
 * @property {string}  prompt  - HTML of the question; '' when there is none
 * @property {string}  passage - HTML of the passage, with every dropdown in place
 * @property {boolean} shuffle - The question's Shuffle setting, applied to every dropdown
 */

/**
 * @typedef {object} InlineChoiceDropdown
 * @property {string}                         responseIdentifier
 * @property {Array<{id: string, text: string}>} options
 * @property {string|null}                    correctId - null when unmarked or not its own option
 */

export function _defaultState() {
  return { prompt: '', passage: '', shuffle: false };
}

/**
 * Read every dropdown out of the passage, in document order. The passage is the only copy
 * of the dropdowns, so this is the single reader.
 *
 * @param {string} passage - InlineChoiceState.passage
 * @returns {InlineChoiceDropdown[]}
 */
export function getDropdowns(passage) {
  const doc = parseXML(passage || '', 'text/html');
  return [...doc.querySelectorAll(DROPDOWN)].map(readDropdown);
}

/**
 * @param {Element} el - A `<qti-inline-choice-interaction>` as it is held in the passage
 * @returns {InlineChoiceDropdown}
 */
export function readDropdown(el) {
  const options = [...el.querySelectorAll(OPTION)].map(option => ({
    id: option.getAttribute('identifier') ?? '',
    text: option.textContent,
  }));
  const correct = el.getAttribute(CORRECT_ATTR);
  return {
    responseIdentifier: el.getAttribute('response-identifier') ?? '',
    options,
    correctId: options.some(option => option.id === correct) ? correct : null,
  };
}

/**
 * @param {string[]} responseDeclarations
 * @returns {Map<string, string>} response identifier → declared correct choice id
 */
function correctValuesByResponse(responseDeclarations) {
  const correct = new Map();
  for (const declXml of responseDeclarations || []) {
    try {
      const declaration = QTIDeclaration.fromXML(parseXML(declXml).documentElement);
      const [value] = declaration.correctResponse ?? [];
      if (value !== undefined && value !== null) {
        correct.set(declaration.identifier, String(value));
      }
    } catch {
      // A malformed declaration just leaves its dropdown without a correct answer.
    }
  }
  return correct;
}

/**
 * Parse step (saved XML → InlineChoiceState): normalises every dropdown in place into the
 * shape the passage holds: item-wide unique ids, plain-text options, only the two editor
 * attributes kept. The correct answer is resolved against each dropdown's own original
 * option ids before any renaming so it follows the rename.
 *
 * @param {Element} root - The parsed `<qti-item-body>`, changed in place
 * @param {Map<string, string>} correctByResponse - From correctValuesByResponse: response
 *   identifier → the choice id its declaration marks correct
 * @returns {boolean} whether any dropdown had shuffle="true"
 */
function normalizeDropdowns(root, correctByResponse) {
  const seenResponseIds = new Set();
  const seenChoiceIds = new Set();
  let shuffle = false;

  for (const el of root.querySelectorAll(DROPDOWN)) {
    shuffle = shuffle || el.getAttribute('shuffle') === 'true';

    const originalResponseId = el.getAttribute('response-identifier');
    const repeated = !originalResponseId || seenResponseIds.has(originalResponseId);
    const responseId = repeated ? generateRandomSlug('response') : originalResponseId;
    seenResponseIds.add(responseId);
    const declaredCorrect = repeated ? undefined : correctByResponse.get(originalResponseId);

    let correctId = null;
    for (const option of el.querySelectorAll(OPTION)) {
      const originalId = option.getAttribute('identifier');
      const id =
        !originalId || seenChoiceIds.has(originalId) ? generateRandomSlug('choice') : originalId;
      seenChoiceIds.add(id);
      if (correctId === null && originalId !== null && originalId === declaredCorrect) {
        correctId = id;
      }
      option.setAttribute('identifier', id);
      // Options are plain text; flatten any markup an imported item carried.
      const text = option.textContent;
      option.textContent = text;
    }

    for (const name of el.getAttributeNames()) {
      if (!KEPT_DROPDOWN_ATTRS.includes(name)) el.removeAttribute(name);
    }
    el.setAttribute('response-identifier', responseId);
    if (correctId === null) {
      el.removeAttribute(CORRECT_ATTR);
    } else {
      el.setAttribute(CORRECT_ATTR, correctId);
    }
  }
  return shuffle;
}

/**
 * Parse a `<qti-item-body>` XML string + response declarations → InlineChoiceState.
 *
 * @param {string} bodyXml - Serialized `<qti-item-body>` element
 * @param {string[]} responseDeclarations
 * @returns {InlineChoiceState}
 */
export function parseInlineChoiceInteraction(bodyXml, responseDeclarations) {
  if (!bodyXml) return _defaultState();

  let body;
  try {
    body = parseXML(bodyXml).documentElement;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[QTI Editor] Failed to parse inline choice interaction XML:', err);
    return _defaultState();
  }

  for (const sentinel of body.querySelectorAll(`${DROPDOWN}[${SENTINEL_MARKER}]`)) {
    (sentinel.closest('p') ?? sentinel).remove();
  }
  // Dropdowns belong in the passage only; one in the question is dropped.
  for (const child of [...body.children]) {
    if (!child.hasAttribute(PROMPT_MARKER)) continue;
    if (child.localName === DROPDOWN) {
      child.remove();
    } else {
      removeDropdowns(child);
    }
  }

  const correctByResponse = correctValuesByResponse(responseDeclarations);
  const shuffle = normalizeDropdowns(body, correctByResponse);

  const promptNodes = [];
  const passageNodes = [];
  for (const child of body.childNodes) {
    const isElement = child.nodeType === Node.ELEMENT_NODE;
    if (!isElement && !(child.nodeType === Node.TEXT_NODE && child.nodeValue.trim())) continue;
    if (isElement && child.hasAttribute(PROMPT_MARKER)) {
      child.removeAttribute(PROMPT_MARKER);
      promptNodes.push(child);
    } else {
      passageNodes.push(child);
    }
  }

  const namespace = body.namespaceURI;
  return {
    prompt: serializeAsHtml(promptNodes, namespace),
    passage: serializeAsHtml(passageNodes, namespace),
    shuffle,
  };
}

/** @param {Element} root - Changed in place */
function removeDropdowns(root) {
  for (const el of root.querySelectorAll(DROPDOWN)) el.remove();
}

/** The placeholder that keeps an item with no dropdown recognisable as inline choice. */
function buildSentinelNode() {
  const option = buildXmlNode({ tag: OPTION, attrs: { identifier: SENTINEL_ID } });
  const interaction = buildXmlNode({
    tag: DROPDOWN,
    attrs: { 'response-identifier': SENTINEL_ID, [SENTINEL_MARKER]: '' },
    children: [option],
  });
  return buildXmlNode({ tag: 'p', children: [interaction] });
}

/**
 * @param {InlineChoiceDropdown} dropdown
 * @param {{ baseType: string, cardinality: string }} declarationSchema
 * @returns {string} Serialized `<qti-response-declaration>`
 */
function buildDeclarationXml(dropdown, declarationSchema) {
  const declaration = new QTIDeclaration({
    identifier: dropdown.responseIdentifier,
    ...declarationSchema,
    tag: 'qti-response-declaration',
  });
  if (dropdown.correctId !== null) {
    new CorrectResponse([dropdown.correctId], declaration);
  }
  return serializer.serializeToString(declaration.getXML());
}

/**
 * Build step: give each repeated response or choice identifier in the passage a new one
 * derived from it, so a passage holding a copy of a dropdown still saves unique ids.
 * Derived rather than random, so rebuilding unchanged state writes unchanged XML.
 * data-studio-correct follows its option's rename. Missing ids are left missing.
 *
 * @param {Element} passageEl - Container holding the passage, changed in place
 */
function renameRepeatedIds(passageEl) {
  const dropdownEls = [...passageEl.querySelectorAll(DROPDOWN)];
  const optionEls = dropdownEls.flatMap(el => [...el.querySelectorAll(OPTION)]);
  const taken = new Set([
    ...dropdownEls.map(el => el.getAttribute('response-identifier')),
    ...optionEls.map(el => el.getAttribute('identifier')),
  ]);
  const uniqueIn = seen => id => {
    let unique = id;
    if (seen.has(id)) {
      let n = 2;
      while (taken.has(`${id}_${n}`)) n++;
      unique = `${id}_${n}`;
    }
    seen.add(unique);
    taken.add(unique);
    return unique;
  };
  const uniqueResponseId = uniqueIn(new Set());
  const uniqueChoiceId = uniqueIn(new Set());

  for (const el of dropdownEls) {
    const responseId = el.getAttribute('response-identifier');
    if (responseId) el.setAttribute('response-identifier', uniqueResponseId(responseId));

    const correct = el.getAttribute(CORRECT_ATTR);
    let correctFollowed = false;
    for (const option of el.querySelectorAll(OPTION)) {
      const id = option.getAttribute('identifier');
      if (!id) continue;
      const unique = uniqueChoiceId(id);
      option.setAttribute('identifier', unique);
      if (!correctFollowed && id === correct) {
        el.setAttribute(CORRECT_ATTR, unique);
        correctFollowed = true;
      }
    }
  }
}

/**
 * Serialize InlineChoiceState → { bodyXml, responseDeclarations }.
 *
 * @param {InlineChoiceState} state
 * @param {string} questionType
 * @param {{ baseType: string, cardinality: string }} declarationSchema
 * @returns {{ bodyXml: string, responseDeclarations: string[] }}
 */
export function buildInlineChoiceInteractionXML(state, questionType, declarationSchema) {
  const { prompt, passage, shuffle } = state;

  const passageEl = buildXmlNode({ tag: 'div', innerHTML: passage || '' });
  renameRepeatedIds(passageEl);
  // Read before the loop below strips data-studio-correct.
  const dropdowns = [...passageEl.querySelectorAll(DROPDOWN)].map(readDropdown);
  for (const el of passageEl.querySelectorAll(DROPDOWN)) {
    el.removeAttribute(CORRECT_ATTR);
    el.setAttribute('shuffle', String(Boolean(shuffle)));
    // Trimmed here, not in editor state, so typing is untouched.
    for (const option of el.querySelectorAll(OPTION)) {
      option.textContent = option.textContent.trim();
    }
  }

  const promptEl = buildXmlNode({ tag: 'div', innerHTML: prompt || '' });
  // Dropdowns belong in the passage only; one in the question is not saved.
  removeDropdowns(promptEl);
  const promptChildren = wrapInlineRuns(promptEl);
  for (const el of promptChildren) el.setAttribute(PROMPT_MARKER, '');

  const passageChildren = wrapInlineRuns(passageEl);
  if (!dropdowns.length) passageChildren.push(buildSentinelNode());

  const bodyEl = buildXmlNode({
    tag: 'qti-item-body',
    children: [...promptChildren, ...passageChildren],
  });

  return {
    bodyXml: serializer.serializeToString(bodyEl),
    responseDeclarations: dropdowns.map(d => buildDeclarationXml(d, declarationSchema)),
  };
}
