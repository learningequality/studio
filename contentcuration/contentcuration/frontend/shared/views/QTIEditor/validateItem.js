import { QuestionType, ValidationError } from './constants';
import { parseItem } from './serialization/parseItem';
import { resolveDescriptor } from './interactions/resolveDescriptor';

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

  if (!item.interactions.length) {
    return [{ code: ValidationError.NO_INTERACTION }];
  }

  const errors = [];
  for (const { bodyXml, responseDeclarations } of item.interactions) {
    const { descriptor, questionType, error } = resolveDescriptor(bodyXml, responseDeclarations);
    if (error) {
      errors.push({ code: error });
      continue;
    }
    if (!allowFreeResponse && questionType === QuestionType.FREE_RESPONSE) {
      errors.push({ code: ValidationError.FREE_RESPONSE_NOT_ALLOWED });
    }
    const state = descriptor.parse(bodyXml, responseDeclarations);
    errors.push(...descriptor.validate(state, questionType));
  }
  return errors;
}
