import defineInteraction from '../defineInteraction';
import ChoiceInteractionEditor from './ChoiceInteractionEditor.vue';
import { choiceInteractionDescriptor } from './ChoiceInteractionDescriptor';

/**
 * @typedef {object} ChoiceAnswer
 * @property {string}  id       - QTI identifier, e.g. "choice_xlqTuVoq"
 * @property {string}  content  - HTML content of the <qti-simple-choice>
 * @property {boolean} correct  - Whether this choice is in the correct response
 * @property {boolean} fixed    - Whether this choice is fixed (round-trip only)
 */

/**
 * @typedef {object} ChoiceState
 * @property {string}        prompt      - HTML content of <qti-prompt>; default ""
 * @property {ChoiceAnswer[]} answers
 * @property {number}        maxChoices  - From max-choices attribute (0 = unlimited)
 * @property {number}        minChoices  - From min-choices attribute; default 0
 * @property {boolean}       shuffle     - From shuffle attribute; default false
 * @property {string}        orientation - From orientation attribute; default "vertical"
 */

export default defineInteraction(choiceInteractionDescriptor, ChoiceInteractionEditor);
