import { mapActions, mapGetters, mapState } from 'vuex';
import containerMixin from './container';
import { DraggableTypes } from 'shared/mixins/draggable/constants';
import { animationThrottle } from 'shared/utils';

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
    ...mapState('draggable/items', [
      'activeDraggableId',
      'hoverDraggableId',
      'hoverDraggableSection',
    ]),
    ...mapGetters('draggable/items', ['draggingTargetSection']),
  },
  watch: {
    hoverDraggableCollectionId(id) {
      if (id && this.draggableCollectionId && id !== this.draggableCollectionId) {
        this.emitDraggableDragLeave({});
      }
    },
    hoverDraggableRegionId(id) {
      if (id && this.draggableRegionId && id !== this.draggableRegionId) {
        this.emitDraggableDragLeave({});
      }
    },
  },
  mounted() {
    // Unfortunately, Firefox doesn't send us the mouse coordinates with `drag` event,
    // but the `dragover` event does. This is not ideal because the dragover event could
    // get fired for many elements, making this is a very weird edge case
    const updateDraggableDirection = animationThrottle(({ clientX, clientY }) => {
      this.updateDraggableDirection({ x: clientX, y: clientY });
    });
    this.$on('draggableDragOver', updateDraggableDirection);
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
