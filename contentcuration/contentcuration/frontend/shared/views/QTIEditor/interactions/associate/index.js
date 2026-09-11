import defineInteraction from '../defineInteraction';
import AssociateInteractionEditor from './AssociateInteractionEditor.vue';
import { associateInteractionDescriptor } from './AssociateInteractionDescriptor';

export default defineInteraction(associateInteractionDescriptor, AssociateInteractionEditor);
