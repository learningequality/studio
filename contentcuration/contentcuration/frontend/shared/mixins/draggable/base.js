import { mapState } from 'vuex';
import { v4 as uuidv4 } from 'uuid';
import { DraggableIdentityHelper } from 'shared/vuex/draggablePlugin/module/utils';

export default {
  props: {
    /**
     * A unique ID with which we'll use to identify draggable areas
     */
    draggableId: {
      type: String,
      default() {
        return uuidv4();
      },
    },
    draggableType: {
      type: String,
      default: null,
    },
    draggableMetadata: {
      type: Object,
      default: () => ({}),
    },
  },
  computed: {
    ...mapState('draggable', ['activeDraggableUniverse', 'draggableDirection']),
    /**
     * @abstract
     * @function
     * @name activeDraggableId
     * @return {string|null}
     */

    draggableIdentity() {
      return {
        id: this.draggableId,
        type: this.draggableType,
        universe: this.draggableUniverse,
        ancestors: this.draggableAncestors,
        metadata: this.draggableMetadata,
      };
    },
    draggableIdentityHelper() {
      return new DraggableIdentityHelper(this.draggableIdentity);
    },
    draggableRegionId() {
      const { region } = this.draggableIdentityHelper;
      return region ? region.id : null;
    },
    draggableCollectionId() {
      const { collection } = this.draggableIdentityHelper;
      return collection ? collection.id : null;
    },
    draggableItemId() {
      const { item } = this.draggableIdentityHelper;
      return item ? item.id : null;
    },
    isActiveDraggable() {
      return this.activeDraggableId === this.draggableId;
    },
    isInActiveDraggableUniverse() {
      return this.activeDraggableUniverse === this.draggableUniverse;
    },
  },
  methods: {
    /**
     * @public
     * @return {{minY: number, minX: number, maxY: number, maxX: number}}
     */
    getDraggableBounds() {
      const { left, top, right, bottom } = this.$el.getBoundingClientRect();
      return {
        minX: left,
        maxX: right,
        minY: top,
        maxY: bottom,
      };
    },
  },
};
