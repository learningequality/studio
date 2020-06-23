import baseMixin from './base';
import { animationThrottle } from 'shared/utils';
import {
  DraggableDirectionFlags,
  DraggableSectionFlags,
} from 'shared/vuex/draggablePlugin/module/constants';

export default {
  mixins: [baseMixin],
  computed: {
    isInActiveDraggableUniverse() {
      return this.activeDraggableUniverse === this.draggableUniverse;
    },
    isActiveDraggable() {
      return this.activeDraggableId === this.draggableId;
    },
    isDraggingOver() {
      return this.isDraggingOverTop || this.isDraggingOverBottom;
    },
    isDraggingOverTop() {
      return this.isDraggingOverSection(DraggableSectionFlags.TOP, this.draggableId);
    },
    isDraggingOverBottom() {
      return this.isDraggingOverSection(DraggableSectionFlags.BOTTOM, this.draggableId);
    },
    isDraggingUp() {
      return this.isDraggingDirection(DraggableDirectionFlags.UP);
    },
    isDraggingDown() {
      return this.isDraggingDirection(DraggableDirectionFlags.DOWN);
    },
    dropEffect() {
      return this.isInActiveDraggableUniverse ? 'move copy' : 'none';
    },
    /**
     * To be overridden with draggable type specific Vuex getter
     * @return {boolean}
     */
    isDraggingOverSection() {
      return false;
    },
    /**
     * To be overridden with draggable type specific Vuex getter
     * @return {string|null}
     */
    activeDraggableId() {
      return null;
    },
  },
  methods: {
    /**
     * @public
     * @param {Function} callback
     */
    onDraggableDragEnter(callback) {
      this.addDraggableEventListener('dragenter', e => {
        // e.preventDefault();
        callback(e);
      });
    },

    /**
     * @public
     * @param {Function} callback
     */
    onDraggableDragOver(callback) {
      // Throttle these events since they happen as the mouse moves while hovering
      const throttled = animationThrottle(callback);

      this.addDraggableEventListener(
        'dragover',
        e => {
          // e.preventDefault();

          if (e.dataTransfer.dropEffect !== this.dropEffect) {
            e.dataTransfer.dropEffect = this.dropEffect;
          }

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
    onDraggableDragLeave(callback) {
      this.addDraggableEventListener('dragleave', e => {
        // e.preventDefault();
        callback(e);
      });
    },
  },
};
