import defineInteraction from '../defineInteraction';
import TextEntryEditor from './TextEntryEditor.vue';
import { textEntryInteractionDescriptor } from './TextEntryInteractionDescriptor';

/**
 * @typedef {object} TextEntryAnswer
 * @property {string}  id            - Client-side slug (not serialized to XML)
 * @property {string}  value         - The answer value as a string. For numeric this is a
 *                                     float/int string (e.g. "12", "0.5"); for textEntry it
 *                                     is a free-form string (e.g. "Paris").
 * @property {boolean} caseSensitive - textEntry only. When true, "H2O" ≠ "h2o".
 *                                     Always false for numeric answers.
 */

/**
 * @typedef {object} TextEntryState
 * @property {string}            prompt         - HTML content of the question prompt; default ""
 * @property {TextEntryAnswer[]} answers        - Acceptable correct answers.
 *                                                Empty ([]) for freeResponse.
 * @property {number}            expectedLength - Value of the `expected-length` attribute.
 *                                                FREE_RESPONSE_EXPECTED_LENGTH for freeResponse;
 *                                                0 (absent) for numeric and textEntry.
 */

export default defineInteraction(textEntryInteractionDescriptor, TextEntryEditor);
