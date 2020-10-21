import { mapActions, mapGetters } from 'vuex';
import baseMixin from './base';
import { DraggableTypes } from './constants';
import { animationThrottle, extendSlot } from 'shared/utils/helpers';

export default {
  mixins: [baseMixin],
  inject: {
    draggableUniverse: { default: null },
    draggableRegionId: { default: null },
    draggableCollectionId: { default: null },
    draggableItemId: { default: null },
    draggableAncestors: { default: () => [] },
  },
  props: {
    draggable: {
      type: Boolean,
      default() {
        return !!(this.draggableUniverse && this.draggableRegionId);
      },
    },
    grouped: {
      type: Boolean,
      default: false,
    },
    effectsAllowed: {
      type: String,
      default: 'move copy',
    },
  },
  data() {
    return {
      draggableType: DraggableTypes.HANDLE,
    };
  },
  computed: {
    ...mapGetters('draggable/handles', ['activeDraggableId']),
    isDragging() {
      return this.draggableId === this.activeDraggableId;
    },
    draggableIdentity() {
      return {
        id: this.draggableId,
        universe: this.draggableUniverse,
        regionId: this.draggableRegionId,
        collectionId: this.draggableCollectionId,
        itemId: this.draggableItemId,
        ancestors: this.draggableAncestors,
      };
    },
  },
  watch: {
    grouped(isGrouped) {
      // Watch group status to add this handle to the grouped handles
      if (isGrouped) {
        this.addGroupedDraggableHandle(this.draggableIdentity);
      } else {
        this.removeGroupedDraggableHandle(this.draggableIdentity);
      }
    },
  },
  methods: {
    ...mapActions('draggable', [
      'updateDraggableDirection',
      'resetDraggableDirection',
      'addGroupedDraggableHandle',
      'removeGroupedDraggableHandle',
    ]),
    ...mapActions('draggable/handles', ['setActiveDraggable', 'resetActiveDraggable']),
    /**
     * @param {DragEvent} e
     */
    emitDraggableDragStart(e) {
      // If draggability(TM) isn't enabled then we shouldn't trigger any dragging events!
      if (!this.draggable) {
        e.preventDefault();
        return;
      }

      // Set draggable image
      const dragImage = new Image();
      dragImage.src =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII=';
      e.dataTransfer.setDragImage(dragImage, 1, 1);
      e.dataTransfer.setData('draggableIdentity', JSON.stringify(this.draggableIdentity));
      e.dataTransfer.effectAllowed = this.effectsAllowed;

      this.throttledUpdateDraggableDirection.cancel();
      this.emitDraggableDrag(e);
      this.throttledUpdateDraggableDirection.flush();
      this.setActiveDraggable(this.draggableIdentity);
    },
    /**
     * @param {DragEvent} e
     */
    emitDraggableDrag(e) {
      const { clientX, clientY } = e;

      // Firefox has given 0,0 values
      if (!clientX && !clientY) {
        return;
      }

      this.throttledUpdateDraggableDirection({
        x: clientX,
        y: clientY,
      });
    },
    emitDraggableDragEnd() {
      this.throttledUpdateDraggableDirection.cancel();
      this.resetDraggableDirection();
      this.$nextTick(() => this.resetActiveDraggable());
    },
    extendSlot,
  },
  created() {
    this.throttledUpdateDraggableDirection = animationThrottle(args =>
      this.updateDraggableDirection(args)
    );
  },
  render() {
    const { isDragging, draggable } = this;

    return this.extendSlot(
      'default',
      {
        class: {
          'in-draggable-universe': this.isInActiveDraggableUniverse,
          'is-dragging': isDragging,
        },
        attrs: {
          draggable: String(this.draggable),
          'aria-grabbed': String(isDragging),
        },
        on: {
          dragstart: this.emitDraggableDragStart,
          drag: this.emitDraggableDrag,
          dragend: this.emitDraggableDragEnd,
        },
      },
      { isDragging, draggable }
    );
  },
};
