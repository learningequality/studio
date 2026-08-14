import { QtiInteraction } from '../constants';
import ChoiceEditor from './choice/Editor.vue';
import TextEntryEditor from './textEntry/Editor.vue';
import OrderingEditor from './ordering/Editor.vue';

/**
 * Entry point for the editor tree: the descriptors, plus the Vue component that edits each
 * interaction.
 *
 * The editors live here rather than on the descriptors themselves so that `./descriptors`
 * stays free of `.vue` files — see the note there. Import this module when something is
 * going to be rendered, and `./descriptors` when it is not.
 */
export const editors = Object.freeze({
  [QtiInteraction.CHOICE]: ChoiceEditor,
  [QtiInteraction.TEXT_ENTRY]: TextEntryEditor,
  [QtiInteraction.ORDER]: OrderingEditor,
});

export {
  DEFAULT_INTERACTION,
  descriptors,
  registry,
  getDescriptorForQuestionType,
} from './descriptors';
