import { mapActions, mapGetters } from 'vuex';
import debounce from 'lodash/debounce';
import { DropEventHelper, objectValuesValidator } from './utils';
import baseMixin from './base';
import { DraggableFlags } from 'shared/vuex/draggablePlugin/module/constants';
import { animationThrottle, extendSlot } from 'shared/utils/helpers';
import {
  DraggableTypes,
  DraggableContainerTypes,
  DropEffect,
  DragEffect,
} from 'shared/mixins/draggable/constants';

export default {
  mixins: [baseMixin],
  provide() {
    const { draggableId, draggableUniverse } = this;

    // Provide list of ancestors, and be sure to make a copy to avoid rewriting above the tree
    const draggableAncestors = (this.draggableAncestors || []).slice();
    if (draggableId) {
      draggableAncestors.push(this.draggableIdentity);
    }

    return {
      draggableUniverse,
      draggableAncestors,
    };
  },
  props: {
    /**
     * The draggable container that's the immediate draggable ancestor of the handle needs to
     * allow separate event binding properties, in this case, whether to use capturing
     */
    useCapture: {
      type: Boolean,
      default: false,
      required: false,
    },
    draggableSize: {
      type: Number,
      default: null,
    },
    draggableType: {
      type: String,
      default: DraggableTypes.CONTAINER,
      validator: objectValuesValidator(DraggableContainerTypes),
    },
    dropEffect: {
      type: String,
      default: DropEffect.NONE,
      validator: objectValuesValidator(DropEffect),
    },
    dragEffect: {
      type: String,
      default: DragEffect.DEFAULT,
      validator: objectValuesValidator(DragEffect),
    },
    beforeStyle: {
      type: Function,
      default: null,
    },
    afterStyle: {
      type: Function,
      default: null,
    },
  },
  data() {
    return {
      effectAllowed: null,
      draggableDragEntered: false,
      hoverDraggableSize: this.draggableSize,
      debouncedEmitDraggableDragLeave: () => {},
    };
  },
  computed: {
    ...mapGetters('draggable', [
      'activeDraggableSize',
      'deepestHoverDraggable',
      'isHoverDraggableAncestor',
      'getDraggableDropData',
    ]),
    /**
     * @abstract
     * @function
     * @name hoverDraggableId
     * @return {string|null}
     */
    /**
     * @abstract
     * @function
     * @name hoverDraggableSection
     * @return {number|null}
     */
    /**
     * @abstract
     * @function
     * @name hoverDraggableTarget
     * @return {number|null}
     */
    hasDescendantHoverDraggable() {
      return this.isHoverDraggableAncestor(this.draggableIdentity);
    },
    hoveringOtherDraggable() {
      const { id, type } = this.deepestHoverDraggable || {};
      return id && (id !== this.draggableId || type !== this.draggableType);
    },
    isDraggingOver() {
      return this.hoverDraggableId === this.draggableId;
    },
    activeDropEffect() {
      return this.isInActiveDraggableUniverse ? this.dropEffect : DropEffect.NONE;
    },
    isDropAllowed() {
      const effectAllowed = (this.effectAllowed || DropEffect.NONE).toLowerCase();
      return (
        this.effectAllowed !== DropEffect.NONE &&
        this.activeDropEffect !== DropEffect.NONE &&
        Boolean(effectAllowed.match(this.activeDropEffect))
      );
    },
    beforeStyles() {
      if (this.beforeStyle) {
        return this.beforeStyle(this.size, this.hoverDraggableSize);
      }

      return null;
    },
    afterStyles() {
      if (this.afterStyle) {
        return this.afterStyle(this.size, this.hoverDraggableSize);
      }

      return null;
    },
    beforeComputedClass() {
      return this.beforeStyles ? this.$computedClass(this.beforeStyles) : null;
    },
    afterComputedClass() {
      return this.afterStyles ? this.$computedClass(this.afterStyles) : null;
    },
    size() {
      return this.isActiveDraggable
        ? this.activeDraggableSize || this.hoverDraggableSize
        : Math.min(this.hoverDraggableSize, this.activeDraggableSize);
    },
    dropData() {
      return this.getDraggableDropData(this.draggableIdentity);
    },
  },
  watch: {
    /**
     * Dispatches an update to the draggable size. We should potentially debounce this since
     * the dragging as animations that may cause this value to be different if the user drags,
     * drops, and drags again very quickly
     *
     * TODO: Update to set width instead based off new `draggableAxis` property if necessary
     *
     * @param isActive
     */
    isActiveDraggable(isActive) {
      if (isActive) {
        const size = this.draggableSize === null ? this.$el.offsetHeight : this.draggableSize;
        this.setActiveDraggableSize({ size });
      }
    },
    activeDraggableId(id) {
      if (id) {
        this.hoverDraggableSize = this.draggableSize || this.$el.offsetHeight || 0;
      } else {
        // Defensive measures
        this.draggableDragEntered = false;
      }
    },
    /**
     * Defensive measures against flaky DragEvents
     */
    hoverDraggableId(id) {
      if (this.draggableDragEntered && id !== this.draggableId) {
        this.emitDraggableDragLeave();
      }
    },
  },
  methods: {
    ...mapActions('draggable', ['setDraggableDropped', 'clearDraggableDropped']),
    /**
     * @abstract
     * @function
     * @name setHoverDraggable
     * @param {Object} payload
     * @return {Promise<void>}
     */
    /**
     * @abstract
     * @function
     * @name updateHoverDraggable
     * @param {Object} payload
     * @return {Promise<void>}
     */
    /**
     * @abstract
     * @function
     * @name resetHoverDraggable
     * @return {Promise<void>}
     */
    /**
     * @abstract
     * @function
     * @name setActiveDraggableSize
     * @param {Number} size
     * @return {Promise<void>}
     */
    /**
     * Sets the drop effect on the event to ensure we're communicating to the browser
     * the mode of transfer, like move, copy, both, or none
     * @param {DragEvent} e
     */
    setEventDropEffect(e) {
      // We might be triggering an action outside of DOM DragEvents
      if (!e) {
        return;
      }
      const dropEffect = this.activeDropEffect;
      if (!this.hasDescendantHoverDraggable && e.dataTransfer.dropEffect !== dropEffect) {
        e.dataTransfer.dropEffect = dropEffect;
      }
    },
    /**
     * @param {DragEvent} e
     */
    emitDraggableDragEnter(e) {
      e.preventDefault();
      let entered = false;
      this.effectAllowed = e.dataTransfer.effectAllowed;

      if (!this.draggableDragEntered && this.isInActiveDraggableUniverse) {
        this.throttledUpdateHoverDraggable.cancel();
        this.debouncedResetHoverDraggable.cancel();
        entered = this.draggableDragEntered = true;
      }

      this.setEventDropEffect(e);

      if (entered) {
        this.$emit('draggableDragEnter', e);
        this.setHoverDraggable(this.draggableIdentity);
        this.emitDraggableDragOver(e);
        this.throttledUpdateHoverDraggable.flush();
      }
    },
    /**
     * The dragover event should be continuously fired, but some browsers don't do that
     * @param {DragEvent} e
     */
    emitDraggableDragOver(e) {
      e.preventDefault();
      if (!this.draggableDragEntered) {
        return this.emitDraggableDragEnter(e);
      }

      this.debouncedResetHoverDraggable.cancel();
      this.setEventDropEffect(e);
      this.$emit('draggableDragOver', e);
      this.throttledUpdateHoverDraggable({
        ...this.draggableIdentity,
        ...this.getDraggableBounds(),
      });
    },
    /**
     * @param {DragEvent} [e]
     */
    emitDraggableDragLeave(e) {
      if (this.draggableDragEntered) {
        this.debouncedResetHoverDraggable.cancel();
        this.throttledUpdateHoverDraggable.cancel();
        this.$emit('draggableDragLeave', e);
        this.debouncedResetHoverDraggable(this.draggableIdentity);
        this.draggableDragEntered = false;
      }
    },
    emitDraggableDrop(e) {
      e.preventDefault();
      if (!this.draggableDragEntered || !this.isDropAllowed) {
        if (this.draggableDragEntered) {
          this.emitDraggableDragLeave(e);
        }
        return;
      }

      this.setDraggableDropped(this.draggableIdentity)
        .then(() => {
          if (this.dropData) {
            const drop = new DropEventHelper(this.dropData, e);

            if (drop.isValid()) {
              this.$emit('draggableDrop', drop);
            }
          }
        })
        .then(() => this.$nextTick())
        .then(() => {
          // If there was a listener, we'll assume it handled the drop so we'll clear the data
          if (this.$listeners.draggableDrop) {
            this.clearDraggableDropped(this.draggableIdentity);
          }
        })
        .then(() => this.emitDraggableDragLeave(e));
    },
    /**
     * Overridable method for serving the scoped slot properties
     * @returns {Object<Boolean|String>}
     */
    draggableScopedSlotProps() {
      const {
        isInActiveDraggableUniverse,
        isDraggingOver,
        isActiveDraggable,
        activeDropEffect,
        isDropAllowed,
      } = this;
      return {
        isInActiveDraggableUniverse,
        isDraggingOver,
        isActiveDraggable,
        dropEffect: activeDropEffect,
        isDropAllowed: isInActiveDraggableUniverse && isDraggingOver && isDropAllowed,
      };
    },
    /**
     * Add custom method for rendering
     */
    extendSlot,
  },
  mounted() {
    // Debounce the leave emitter since it can get fired multiple times, and there are some browser
    // inconsistencies that make relying on the drag events difficult. This helps
    this.throttledUpdateHoverDraggable = animationThrottle(args => this.updateHoverDraggable(args));
    this.debouncedResetHoverDraggable = debounce(args => {
      this.resetHoverDraggable(args);
      this.effectAllowed = null;
    }, 500);
  },
  render() {
    // Add event key modifier if we're supposed to use capturing
    const eventKey = eventName => {
      return this.useCapture ? `!${eventName}` : eventName;
    };

    const dropCondition =
      this.isInActiveDraggableUniverse &&
      this.isDraggingOver &&
      this.isDropAllowed &&
      !this.hasDescendantHoverDraggable &&
      !this.isActiveDraggable;

    // TODO: Add `draggableAxis` prop and switch direction checking
    // Styling explicitly for when we're dragging this item, so when we've picked this up
    // and no longer hovering over it's original placement, the height will go to zero
    const style = {};
    if (this.isActiveDraggable && this.dragEffect === DragEffect.SORT) {
      style.height = this.hoveringOtherDraggable ? '0px' : `${this.size}px`;
    }

    const dynamicClasses = {
      [`draggable-${this.draggableType}`]: true,
      'in-draggable-universe': this.isInActiveDraggableUniverse,
      'dragging-over': this.isDraggingOver,
      'drop-allowed': this.isDropAllowed,
      'dragging-over-top':
        dropCondition && Boolean(this.hoverDraggableSection & DraggableFlags.TOP),
      'dragging-over-bottom':
        dropCondition && Boolean(this.hoverDraggableSection & DraggableFlags.BOTTOM),
      'active-draggable': this.isActiveDraggable,
    };

    if (this.dragEffect === DragEffect.SORT) {
      // Swap section based off whether we just left a descendent draggable
      const beforeCondition =
        dropCondition && Boolean(this.hoverDraggableTarget & DraggableFlags.TOP);
      const afterCondition =
        dropCondition && Boolean(this.hoverDraggableTarget & DraggableFlags.BOTTOM);

      Object.assign(dynamicClasses, {
        'drag-target-before': beforeCondition,
        'drag-target-after': afterCondition,
      });

      if (this.beforeComputedClass) {
        dynamicClasses[this.beforeComputedClass] = beforeCondition;
      }
      if (this.afterComputedClass) {
        dynamicClasses[this.afterComputedClass] = afterCondition;
      }
    }

    return this.extendSlot(
      'default',
      {
        class: dynamicClasses,
        style,
        attrs: {
          'aria-dropeffect': this.activeDropEffect,
        },
        on: {
          [eventKey('dragenter')]: this.emitDraggableDragEnter,
          [eventKey('dragover')]: this.emitDraggableDragOver,
          [eventKey('dragleave')]: this.emitDraggableDragLeave,
          [eventKey('drop')]: this.emitDraggableDrop,
        },
      },
      this.draggableScopedSlotProps(),
    );
  },
};
