import { parseXML } from '../serialization/xml';
import { ValidationError } from '../constants';
import { HEADLESS_INTERACTIONS, SINGLE_INSTANCE_INTERACTIONS, descriptors } from './descriptors';

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
 *   descriptor: object|null,
 *   questionType: string|null,
 *   error: string|null,
 * }} `descriptor` is null when no descriptor matches the interaction. `error` is a
 *   ValidationError code; callers own how it is presented.
 */
export function resolveDescriptor(bodyXml, responseDeclarations) {
  if (!bodyXml) {
    return { descriptor: null, questionType: null, error: null };
  }
  let descriptor = null;
  try {
    const interactionEl = parseXML(bodyXml).documentElement;
    descriptor = descriptors.find(d => d.matches(interactionEl)) ?? null;
    return {
      descriptor,
      questionType: descriptor?.getQuestionType(interactionEl, responseDeclarations) ?? null,
      error: null,
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[QTI] Failed to parse interaction XML:', e.message);
    return { descriptor, questionType: null, error: ValidationError.PARSE_ERROR };
  }
}

/**
 * Whether the editor can edit an item faithfully: it holds exactly one interaction block
 * (one interaction, for descriptors in SINGLE_INSTANCE_INTERACTIONS), and a descriptor
 * with an editor exists for it that could read the interaction.
 *
 * @param {Array<{ bodyXml: string, responseDeclarations: string[] }>} interactions - As
 *   returned by parseItem
 * @returns {boolean}
 */
export function isSupportedItem(interactions) {
  if (interactions.length !== 1) {
    return false;
  }
  const [{ bodyXml, responseDeclarations }] = interactions;
  const { descriptor, error } = resolveDescriptor(bodyXml, responseDeclarations);
  if (descriptor === null || error || HEADLESS_INTERACTIONS.includes(descriptor.type)) {
    return false;
  }
  return (
    !SINGLE_INSTANCE_INTERACTIONS.includes(descriptor.type) ||
    parseXML(bodyXml).getElementsByTagName(descriptor.type).length <= 1
  );
}
