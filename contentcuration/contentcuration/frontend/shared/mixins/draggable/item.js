import { mapActions, mapGetters, mapState } from 'vuex';
import containerMixin from './container';
import { DraggableTypes } from 'shared/mixins/draggable/constants';

export default {
  mixins: [containerMixin],
  inject: {
    draggableUniverse: { default: null },
    draggableRegionId: { default: null },
    draggableCollectionId: { default: null },
  },
  provide() {
    return {
      draggableItemId: this.draggableId,
    };
  },
  props: {
    useCapture: {
      type: Boolean,
      default: true,
      required: false,
    },
  },
  data() {
    return {
      draggableType: DraggableTypes.ITEM,
    };
  },
  computed: {
    ...mapState('draggable/items', ['activeDraggableId', 'hoverDraggableId']),
    ...mapGetters('draggable/items', ['draggingTargetSection']),
  },
  methods: {
    ...mapActions('draggable/items', [
      'setHoverDraggable',
      'updateHoverDraggable',
      'resetHoverDraggable',
    ]),
  },
};
