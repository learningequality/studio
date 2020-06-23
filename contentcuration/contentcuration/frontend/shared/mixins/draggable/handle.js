import { mapActions, mapState } from 'vuex';
import baseMixin from './base';
import { DraggableTypes } from './constants';
import { animationThrottle } from 'shared/utils';

export default {
  mixins: [baseMixin],
  inject: {
    draggableUniverse: { default: null },
    draggableRegionId: { default: null },
    draggableCollectionId: { default: null },
    draggableItemId: { default: null },
  },
  props: {
    draggable: {
      type: Boolean,
      default() {
        return !!(this.draggableUniverse && this.draggableRegionId);
      },
    },
  },
  data() {
    return {
      draggableType: DraggableTypes.HANDLE,
    };
  },
  computed: {
    ...mapState('draggable/handles', ['activeDraggableId']),
    isDragging() {
      return this.draggableId === this.activeDraggableId;
    },
  },
  methods: {
    ...mapActions('draggable/handles', [
      'registerDraggableComponent',
      'unregisterDraggableComponent',
    ]),

    /**
     * @public
     * @param {Function} callback
     */
    onDraggableDragStart(callback) {
      this.addDraggableEventListener('dragstart', e => {
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

        callback(e);
      });
    },

    /**
     * @public
     * @param {Function} callback
     */
    onDraggableDrag(callback) {
      // Throttle the firing of these events since they happen as the mouse moves
      const throttled = animationThrottle(callback);

      this.addDraggableEventListener(
        'drag',
        e => {
          // e.preventDefault();
          throttled(e);
        },
        false,
        throttled.cancel
      );
    },

    /**
     * @public
     * @param {Function} callback
     */
    onDraggableDragEnd(callback) {
      this.addDraggableEventListener('dragend', e => {
        // e.preventDefault();
        callback(e);
      });
    },
  },
};
