import defineInteraction from '../defineInteraction';
import ChoiceInteractionEditor from './ChoiceInteractionEditor.vue';
import { choiceInteractionDescriptor } from './ChoiceInteractionDescriptor';

export default defineInteraction(choiceInteractionDescriptor, ChoiceInteractionEditor);
