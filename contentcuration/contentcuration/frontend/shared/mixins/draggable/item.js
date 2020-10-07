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
    /**
     * The Item draggable type should be the nearest draggable ancestor to the handle, so we
     * should use event capturing by default
     */
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
    ...mapState('draggable/items', ['hoverDraggableSection']),
    ...mapGetters('draggable/items', [
      'activeDraggableId',
      'hoverDraggableId',
      'draggingTargetSection',
    ]),
  },
  methods: {
    ...mapActions('draggable/items', [
      'setHoverDraggable',
      'updateHoverDraggable',
      'resetHoverDraggable',
      'setActiveDraggableSize',
    ]),
    ...mapActions('draggable', ['updateDraggableDirection']),
  },
};
