import defineInteraction from '../defineInteraction';
import TextEntryEditor from './TextEntryEditor.vue';
import { textEntryInteractionDescriptor } from './TextEntryInteractionDescriptor';

export default defineInteraction(textEntryInteractionDescriptor, TextEntryEditor);
