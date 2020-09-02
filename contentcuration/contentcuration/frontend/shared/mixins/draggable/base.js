import { mapState } from 'vuex';
import uuidv4 from 'uuid/v4';
import { DraggableTypes } from './constants';

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
  },
  computed: {
    ...mapState('draggable', ['activeDraggableUniverse', 'draggableDirection']),
    isDraggableRegion() {
      return this.draggableType === DraggableTypes.REGION;
    },
    isDraggableCollection() {
      return this.draggableType === DraggableTypes.COLLECTION;
    },
    isDraggableItem() {
      return this.draggableType === DraggableTypes.ITEM;
    },
    /**
     * To be overridden returning draggable type specific active ID
     * @return {string|null}
     */
    activeDraggableId() {
      return null;
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
