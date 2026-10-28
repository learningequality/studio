import { QuestionType, ValidationError } from './constants';
import { holdsOnlyHints } from './serialization/hints';
import { parseItem } from './serialization/parseItem';
import {
  XML_NS,
  XSI_NS,
  attributesOf,
  contentChildrenOf,
  isChildElement,
  parseXML,
} from './serialization/xml';
import { isSupportedItem, resolveDescriptor } from './interactions/resolveDescriptor';

/**
 * Validate what is wrong with an item as a whole, rather than with one of its interactions:
 * whether there is anything to answer, and whether the kind of question it asks is one the
 * consumer accepts.
 *
 * These are the only errors an interaction's editor cannot report. An item with nothing to
 * answer mounts no editor at all, and whether free responses are acceptable is the
 * consumer's policy rather than anything the interaction knows — so an editor that is
 * showing an item still asks this about it.
 *
 * Takes what the caller has already read out of the item, so neither the editor nor
 * validateQtiItem has to parse the XML again to ask.
 *
 * @param {object} item
 * @param {Array} item.interactions - The item's interaction blocks
 * @param {Array<string|null>} [item.questionTypes] - The question type of each interaction,
 *   as resolved by the caller
 * @param {boolean} [item.allowFreeResponse] - Whether a question with no correct answer
 *   counts as valid. Consumers that score their questions pass false.
 * @returns {Array<{ code: string }>} Empty when there is nothing wrong with the item itself
 */
export function validateItemShape({ interactions, questionTypes = [], allowFreeResponse = true }) {
  if (!interactions.length) {
    return [{ code: ValidationError.NO_INTERACTION }];
  }
  if (!allowFreeResponse && questionTypes.includes(QuestionType.FREE_RESPONSE)) {
    return [{ code: ValidationError.FREE_RESPONSE_NOT_ALLOWED }];
  }
  return [];
}

/** Root attributes an edit writes, from the item or as the converter does. */
const EDITOR_ROOT_ATTRIBUTES = ['identifier', 'title', 'label', 'tool-name', 'tool-version'];

/** Root flags the editor writes as false, which it can't edit when true. */
const EDITOR_ROOT_FLAGS = ['adaptive', 'time-dependent'];

/** The `xs:language` values an edit can write as `xml:lang`. */
const XS_LANGUAGE = /^[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*$/;

/**
 * @param {Attr} attr
 * @returns {boolean} Whether an edit writes this root attribute back
 */
function isEditorRootAttribute(attr) {
  switch (attr.namespaceURI) {
    case null:
      return (
        EDITOR_ROOT_ATTRIBUTES.includes(attr.localName) ||
        // `language` as converted before c51c5e035, which an edit writes as `xml:lang`.
        (attr.localName === 'language' && XS_LANGUAGE.test(attr.value)) ||
        (EDITOR_ROOT_FLAGS.includes(attr.localName) && ['false', '0'].includes(attr.value.trim()))
      );
    case XML_NS:
      return attr.localName === 'lang';
    case XSI_NS:
      return attr.localName === 'schemaLocation';
    default:
      return false;
  }
}

/** The item children the editor writes; any other child makes the item read-only. */
const EDITOR_CHILDREN = [
  'qti-response-declaration',
  'qti-outcome-declaration',
  'qti-item-body',
  'qti-catalog-info',
  'qti-response-processing',
];

/**
 * Whether anything in the item reads an outcome, such as feedback or a printed variable.
 * The rich-text editors drop these elements, so an edit would lose them even for SCORE.
 *
 * @param {Element} root
 * @returns {boolean}
 */
function readsOutcome(root) {
  return root.querySelector('[outcome-identifier], qti-printed-variable') !== null;
}

/**
 * Whether this item holds outside its body only what the editor writes or regenerates.
 * Response processing and outcome declarations belong to the editor, which regenerates
 * them on every save.
 *
 * @param {string} rawData - The item's XML
 * @returns {boolean}
 */
function keepsItemContent(rawData) {
  const root = parseXML(rawData).documentElement;
  return (
    attributesOf(root).every(isEditorRootAttribute) &&
    contentChildrenOf(root).every(
      el =>
        EDITOR_CHILDREN.some(name => isChildElement(el, name)) &&
        (el.localName !== 'qti-catalog-info' || holdsOnlyHints(el)),
    ) &&
    !readsOutcome(root)
  );
}

/**
 * Whether the editor can edit this parsed, non-blank item faithfully; it shows any other
 * item read-only.
 *
 * @param {{ interactions: Array, itemBodyXml: string }} item - The parsed item
 * @param {string} rawData - The item's XML
 * @returns {boolean}
 */
export function isEditableItem({ interactions, itemBodyXml }, rawData) {
  return isSupportedItem(interactions, itemBodyXml) && keepsItemContent(rawData);
}

/**
 * Validate a QTI assessment item from its raw XML, without rendering it.
 *
 * @param {string} rawData - Full QTI assessment item XML
 * @param {object} [options]
 * @param {boolean} [options.allowFreeResponse] - Whether a free-response question counts
 *   as valid. Consumers that only accept scorable questions pass false.
 * @returns {Array<{ code: string, id?: string }>} Empty when the item is valid. Items whose
 *   body the editor can't read in full report only unreadable XML or a missing interaction.
 */
export function validateQtiItem(rawData, { allowFreeResponse = true } = {}) {
  if (!rawData) {
    return [{ code: ValidationError.NO_INTERACTION }];
  }

  let item;
  try {
    item = parseItem(rawData);
  } catch {
    return [{ code: ValidationError.PARSE_ERROR }];
  }

  const resolved = item.interactions.map(interaction => ({
    ...interaction,
    ...resolveDescriptor(interaction.bodyXml, interaction.responseDeclarations),
  }));

  if (item.interactions.length && !isSupportedItem(item.interactions, item.itemBodyXml)) {
    // The editor can't read the body in full: only unreadable interactions count.
    return resolved.filter(({ error }) => error).map(({ error }) => ({ code: error }));
  }

  const errors = validateItemShape({
    interactions: item.interactions,
    questionTypes: resolved.map(({ questionType }) => questionType),
    allowFreeResponse,
  });
  if (errors.length) {
    return errors;
  }

  for (const { descriptor, questionType, error, bodyXml, responseDeclarations } of resolved) {
    if (error) {
      errors.push({ code: error });
      continue;
    }
    const state = descriptor.parse(bodyXml, responseDeclarations);
    errors.push(...descriptor.validate(state, questionType));
  }
  return errors;
}
