import debounce from 'lodash/debounce';
import baseMixin from './base';
import {
  DraggableDirectionFlags,
  DraggableSectionFlags,
} from 'shared/vuex/draggablePlugin/module/constants';

export default {
  mixins: [baseMixin],
  data() {
    return {
      draggableDragEntered: false,
    };
  },
  computed: {
    isInActiveDraggableUniverse() {
      return this.activeDraggableUniverse === this.draggableUniverse;
    },
    isActiveDraggable() {
      return this.activeDraggableId === this.draggableId;
    },
    isDragEntrance() {
      // Infers that the user has either just started dragging, or is dragging into our container
      return !this.lastHoverDraggableId || this.lastHoverDraggableId === this.activeDraggableId;
    },
    isDraggingOver() {
      return this.isDraggingOverTop || this.isDraggingOverBottom;
    },
    isDraggingOverTop() {
      return this.isDraggingOverSection(DraggableSectionFlags.TOP);
    },
    isDraggingOverBottom() {
      return this.isDraggingOverSection(DraggableSectionFlags.BOTTOM);
    },
    isDraggingUp() {
      return Boolean(this.draggableDirection & DraggableDirectionFlags.UP);
    },
    isDraggingDown() {
      return Boolean(this.draggableDirection & DraggableDirectionFlags.DOWN);
    },
    dropEffect() {
      return this.isInActiveDraggableUniverse ? 'move copy' : 'none';
    },
    isDraggingOverSection() {
      return function(sectionFlag) {
        if (this.draggableId !== this.hoverDraggableId) {
          return false;
        }

        return Boolean(this.hoverDraggableSection & sectionFlag);
      };
    },
    /**
     * To be overridden with draggable type specific Vuex getter
     * @return {string|null}
     */
    activeDraggableId() {
      return null;
    },
  },
  mounted() {
    const { emitDraggableDragLeave } = this;

    // Debounce the leave emitter since it can get fired multiple times, and there are some browser
    // inconsistencies that make relying on the drag events difficult. This helps
    this.emitDraggableDragLeave = debounce(e => emitDraggableDragLeave.call(this, e), 500);

    this.addDraggableEventListener('dragenter', e => {
      // Stop any pending leave events
      this.emitDraggableDragLeave.cancel();

      // Ensures we're communicating to the browser the mode of transfer, like move, copy, or both
      if (e.dataTransfer.dropEffect !== this.dropEffect) {
        e.dataTransfer.dropEffect = this.dropEffect;
      }

      this.emitDraggableDragEnter(e);
    });

    this.addDraggableEventListener('dragleave', e => {
      // Avoids triggering leave for event fired in descendants, but we still want events
      // to get sent downward because of draggable structure
      if (this.$el === e.target || !this.$el.contains(e.target)) {
        this.emitDraggableDragLeave(e);
      }
    });
  },
  methods: {
    emitDraggableDragEnter(e) {
      if (!this.draggableDragEntered) {
        this.draggableDragEntered = true;
        this.$emit('draggableDragEnter', e);
      }
    },

    emitDraggableDragLeave(e) {
      if (this.draggableDragEntered) {
        this.draggableDragEntered = false;
        this.$emit('draggableDragLeave', e);
      }
    },

    /**
     * @public
     * @param {Function} callback
     */
    onDraggableDragEnter(callback) {
      this.$on('draggableDragEnter', callback);
      this.$on('draggableUnregister', () => {
        this.$off('draggableDragEnter', callback);
      });
    },

    /**
     * @public
     * @param {Function} callback
     */
    onDraggableDragOver(callback) {
      this.addDraggableEventListener(
        'dragover',
        e => {
          this.emitDraggableDragLeave.cancel();
          callback(e);

          // Trigger a debounced leave event, as we should get frequent drag over events
          // fired, even if mouse hasn't moved
          this.emitDraggableDragLeave(e);
        },
        false
      );
    },

    /**
     * @public
     * @param {Function} callback
     */
    onDraggableDragLeave(callback) {
      this.$on('draggableDragLeave', callback);
      this.$on('draggableUnregister', () => {
        this.$off('draggableDragLeave', callback);
      });
    },
  },
};
