import { mapActions, mapState } from 'vuex';
import containerMixin from './container';
import { DraggableTypes } from './constants';

export default {
  mixins: [containerMixin],
  props: {
    draggableUniverse: {
      type: String,
      required: true,
    },
  },
  provide() {
    return {
      draggableUniverse: this.draggableUniverse,
      draggableRegionId: this.draggableId,
      draggableCollectionId: null,
    };
  },
  data() {
    return {
      draggableType: DraggableTypes.REGION,
    };
  },
  computed: {
    ...mapState('draggable/regions', [
      'activeDraggableId',
      'hoverDraggableId',
      'lastHoverDraggableId',
      'hoverDraggableSection',
      'lastHoverDraggableSection',
    ]),
  },
  methods: {
    ...mapActions('draggable/regions', [
      'registerDraggableComponent',
      'unregisterDraggableComponent',
    ]),
  },
};
