import { mapActions, mapState } from 'vuex';
import containerMixin from './container';
import { DraggableTypes } from 'shared/mixins/draggable/constants';

export default {
  mixins: [containerMixin],
  inject: {
    draggableUniverse: { default: null },
    draggableRegionId: { default: null },
  },
  provide() {
    return {
      draggableCollectionId: this.draggableId,
    };
  },
  data() {
    return {
      draggableType: DraggableTypes.COLLECTION,
    };
  },
  computed: {
    ...mapState('draggable/collections', [
      'activeDraggableId',
      'hoverDraggableId',
      'lastHoverDraggableId',
      'hoverDraggableSection',
      'lastHoverDraggableSection',
    ]),
  },
  methods: {
    ...mapActions('draggable/collections', [
      'registerDraggableComponent',
      'unregisterDraggableComponent',
    ]),
  },
};
