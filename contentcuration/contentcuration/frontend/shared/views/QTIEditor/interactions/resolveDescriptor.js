import { parseXML } from '../serialization/xml';
import { ValidationError } from '../constants';
import { descriptors, registry, DEFAULT_INTERACTION } from './descriptors';

/**
 * Resolve the interaction descriptor and question type for a single interaction block.
 *
 * Pure and component-free, so both the editor (via useInteractionDescriptor) and the
 * headless validator (validateItem.js) can share one resolution path.
 *
 * @param {string} bodyXml - Serialized interaction element (or item body, for inline
 *   interactions)
 * @param {string[]} [responseDeclarations]
 * @returns {{
 *   descriptor: object,
 *   questionType: string|null,
 *   error: string|null,
 * }} `error` is a ValidationError code; callers own how it is presented.
 */
export function resolveDescriptor(bodyXml, responseDeclarations) {
  if (!bodyXml) {
    return { descriptor: registry[DEFAULT_INTERACTION], questionType: null, error: null };
  }
  try {
    const interactionEl = parseXML(bodyXml).documentElement;
    const descriptor =
      descriptors.find(d => d.matches(interactionEl)) ?? registry[DEFAULT_INTERACTION];
    return {
      descriptor,
      questionType: descriptor.getQuestionType(interactionEl, responseDeclarations) ?? null,
      error: null,
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[QTI] Failed to parse interaction XML:', e.message);
    return {
      descriptor: registry[DEFAULT_INTERACTION],
      questionType: null,
      error: ValidationError.PARSE_ERROR,
    };
  }
}
