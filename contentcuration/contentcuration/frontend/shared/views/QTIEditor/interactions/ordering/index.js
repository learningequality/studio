import defineInteraction from '../defineInteraction';
import OrderingInteractionEditor from './OrderingInteractionEditor.vue';
import { orderingInteractionDescriptor } from './OrderingInteractionDescriptor';

export default defineInteraction(orderingInteractionDescriptor, OrderingInteractionEditor);
