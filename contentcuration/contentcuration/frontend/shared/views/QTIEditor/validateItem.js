import { QuestionType, ValidationError } from './constants';
import { parseItem } from './serialization/parseItem';
import { resolveDescriptor } from './interactions/resolveDescriptor';

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

/**
 * Validate a QTI assessment item from its raw XML, without rendering it.
 *
 * @param {string} rawData - Full QTI assessment item XML
 * @param {object} [options]
 * @param {boolean} [options.allowFreeResponse] - Whether a free-response question counts
 *   as valid. Consumers that only accept scorable questions pass false.
 * @returns {Array<{ code: string, id?: string }>} Empty when the item is valid
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
