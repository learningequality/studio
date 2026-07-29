import { QtiInteraction } from '../constants';
import choiceDescriptor from './choice/index';
import textEntryDescriptor from './textEntry/index';

/**
 * The default interaction type used as fallback when no descriptor matches
 * the interaction element found in the XML body.
 */
export const DEFAULT_INTERACTION = QtiInteraction.CHOICE;

/**
 * Ordered list of all registered interaction descriptors.
 * Searched in order; the first whose `matches(el)` returns true wins.
 */
export const descriptors = [choiceDescriptor, textEntryDescriptor];

/**
 * Registry map keyed by descriptor.type for O(1) direct lookup.
 * Built from the descriptors array — do not populate manually.
 *
 * @type {Object.<string, import('./defineInteraction').InteractionDescriptor>}
 */
export const registry = Object.fromEntries(descriptors.map(d => [d.type, d]));

/**
 * Find the interaction descriptor that supports a given question type.
 *
 * @param {string} questionType
 * @returns {import('./defineInteraction').InteractionDescriptor|undefined}
 */
export function getDescriptorForQuestionType(questionType) {
  return descriptors.find(d => d.questionTypes.includes(questionType));
}
