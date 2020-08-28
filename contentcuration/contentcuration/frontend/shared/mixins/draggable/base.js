import { mapGetters, mapState } from 'vuex';
import uuidv4 from 'uuid/v4';
import { DraggableTypes } from './constants';

export default {
  props: {
    draggableId: {
      type: String,
      default() {
        return uuidv4();
      },
    },
  },
  computed: {
    ...mapState('draggable', ['activeDraggableUniverse', 'draggableDirection']),
    ...mapGetters('draggable', ['activeDraggableHandle']),
    ...mapGetters('draggable/regions', {
      getDraggableRegion: 'getDraggableComponent',
    }),
    ...mapGetters('draggable/collections', {
      getDraggableCollection: 'getDraggableComponent',
    }),
    ...mapGetters('draggable/items', {
      getDraggableItem: 'getDraggableComponent',
    }),
    draggableRegion() {
      return this.getDraggableRegion(this.draggableRegionId);
    },
    draggableCollection() {
      return this.getDraggableCollection(this.draggableCollectionId);
    },
    draggableItem() {
      return this.getDraggableItem(this.draggableItemId);
    },
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
  mounted() {
    this.registerDraggableComponent({ component: this });
  },
  beforeDestroy() {
    this.$emit('draggableUnregister');
    this.unregisterDraggableComponent({ component: this });
  },
  methods: {
    /**
     * @param {string} eventName
     * @param {Function} callback
     * @param {Boolean} [useCapture]
     * @param {Function} [removeCallback]
     */
    addDraggableEventListener(eventName, callback, useCapture = false, removeCallback = () => {}) {
      this.$el.addEventListener(eventName, callback, useCapture);

      this.$on('draggableUnregister', () => {
        this.$el.removeEventListener(eventName, callback);
        removeCallback();
      });
    },

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

    /**
     * The rest to be overridden with DraggableType specific Vuex actions if necessary
     */
    registerDraggableComponent() {},
    unregisterDraggableComponent() {},

    /* eslint-disable no-unused-vars */
    /**
     * @public
     * @param {Function} callback
     */
    onDraggableDragStart(callback) {},

    /**
     * @public
     * @param {Function} callback
     */
    onDraggableDrag(callback) {},

    /**
     * @public
     * @param {Function} callback
     */
    onDraggableDragEnd(callback) {},

    /**
     * @public
     * @param {Function} callback
     */
    onDraggableDragEnter(callback) {},

    /**
     * @public
     * @param {Function} callback
     */
    onDraggableDragOver(callback) {},

    /**
     * @public
     * @param {Function} callback
     */
    onDraggableDragLeave(callback) {},
    /* eslint-enable no-unused-vars */
  },
};
