import debounce from 'lodash/debounce';
import baseMixin from './base';
import { DraggableFlags } from 'shared/vuex/draggablePlugin/module/constants';
import { extendAndRender } from 'shared/utils';

export default {
  mixins: [baseMixin],
  props: {
    useCapture: {
      type: Boolean,
      default: false,
      required: false,
    },
  },
  data() {
    return {
      draggableDragEntered: false,
      debouncedEmitDraggableDragLeave: () => {},
    };
  },
  computed: {
    /**
     * To be overridden with draggable type specific Vuex getter
     * @return {string|null}
     */
    hoverDraggableId() {
      return null;
    },
    /**
     * To be overridden with draggable type specific Vuex getter
     * @return {string|null}
     */
    draggingTargetSection() {
      return null;
    },

    isInActiveDraggableUniverse() {
      return this.activeDraggableUniverse === this.draggableUniverse;
    },
    isActiveDraggable() {
      return this.activeDraggableId === this.draggableId;
    },
    isDraggingOver() {
      return this.hoverDraggableId === this.draggableId;
    },
    dropEffect() {
      return this.isInActiveDraggableUniverse ? 'move copy' : 'none';
    },
  },
  methods: {
    /**
     * To be overridden with draggable type specific Vuex action
     * @abstract
     * @param {Object} payload
     */
    setHoverDraggable() {},
    /**
     * To be overridden with draggable type specific Vuex action
     * @abstract
     * @param {Object} payload
     */
    updateHoverDraggable() {},
    /**
     * To be overridden with draggable type specific Vuex action
     * @abstract
     * @param {Object} payload
     */
    resetHoverDraggable() {},
    /**
     * @param {DragEvent} e
     */
    emitDraggableDragEnter(e) {
      // Ensures we're communicating to the browser the mode of transfer, like move, copy, or both
      if (e.dataTransfer.dropEffect !== this.dropEffect) {
        e.dataTransfer.dropEffect = this.dropEffect;
      }

      if (!this.draggableDragEntered) {
        this.draggableDragEntered = true;
        this.$emit('draggableDragEnter', e);
        this.emitDraggableDragOver(e);
      }
    },
    /**
     * @param {DragEvent} e
     */
    emitDraggableDragOver(e) {
      // Update hover draggable information
      const { clientX, clientY } = e;
      this.updateHoverDraggable({
        id: this.draggableId,
        universe: this.draggableUniverse,
        clientX,
        clientY,
        ...this.getDraggableBounds(),
      });
    },
    /**
     * @param {DragEvent} e
     */
    emitDraggableDragLeave(e) {
      if (this.draggableDragEntered) {
        this.$emit('draggableDragLeave', e);
        this.resetHoverDraggable({ id: this.draggableId, universe: this.draggableUniverse });
        this.draggableDragEntered = false;
      }
    },
    draggableScopedSlotProps() {
      const {
        isInActiveDraggableUniverse,
        isDraggingOver,
        isActiveDraggable,
        dropEffect,
        draggingTargetSection,
      } = this;
      return {
        isInActiveDraggableUniverse,
        isDraggingOver,
        isActiveDraggable,
        dropEffect,
        draggingTargetSection: isDraggingOver ? draggingTargetSection : DraggableFlags.NONE,
      };
    },
  },
  created() {
    // Debounce the leave emitter since it can get fired multiple times, and there are some browser
    // inconsistencies that make relying on the drag events difficult. This helps
    this.debouncedEmitDraggableDragLeave = debounce(e => this.emitDraggableDragLeave(e), 500);
  },
  render() {
    const scopedSlotFunc = () => this.$scopedSlots.default({});
    const emitDraggableDragLeave = this.debouncedEmitDraggableDragLeave;

    const eventKey = eventName => {
      // Add event key modifier if we're supposed to use capturing
      return this.useCapture ? `!${eventName}` : eventName;
    };

    const draggingBeforeClass = this.$computedClass({
      '::before': {
        height: '100px',
      },
    });
    const draggingAfterClass = this.$computedClass({
      '::after': {
        height: '100px',
      },
    });
    return extendAndRender.call(this, scopedSlotFunc, {
      class: {
        [`draggable-${this.draggableType}`]: true,
        'in-draggable-universe': this.isInActiveDraggableUniverse,
        'dragging-over': this.isDraggingOver,
        [draggingBeforeClass]:
          this.isDraggingOver && Boolean(this.draggingTargetSection & DraggableFlags.TOP),
        [draggingAfterClass]:
          this.isDraggingOver && Boolean(this.draggingTargetSection & DraggableFlags.BOTTOM),
        'active-draggable': this.isActiveDraggable,
      },
      attrs: {
        'aria-dropeffect': this.dropEffect,
      },
      on: {
        [eventKey('dragenter')]: e => {
          // Stop any pending leave events
          emitDraggableDragLeave.cancel();
          this.emitDraggableDragEnter(e);
        },
        [eventKey('dragover')]: e => {
          emitDraggableDragLeave.cancel();
          this.emitDraggableDragOver(e);

          // Trigger a debounced leave event, as we should get frequent drag over events
          // fired, even if mouse hasn't moved
          emitDraggableDragLeave(e);
        },
        [eventKey('dragleave')]: e => {
          // Avoids triggering leave for event fired in descendants, but we still want events
          // to get sent downward because of draggable structure
          if (this.$el !== e.target || !this.$el.contains(e.target)) {
            emitDraggableDragLeave(e);
          }
        },
      },
    });
  },
};
