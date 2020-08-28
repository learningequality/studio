import { mapActions, mapState } from 'vuex';
import baseMixin from './base';
import containerMixin from './container';
import { DraggableTypes } from 'shared/mixins/draggable/constants';

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
  data() {
    return {
      draggableType: DraggableTypes.ITEM,
    };
  },
  computed: {
    ...mapState('draggable/items', [
      'activeDraggableId',
      'hoverDraggableId',
      'lastHoverDraggableId',
      'hoverDraggableSection',
      'lastHoverDraggableSection',
    ]),
  },
  methods: {
    ...mapActions('draggable/items', [
      'registerDraggableComponent',
      'unregisterDraggableComponent',
    ]),

    /**
     * @param {string} eventName
     * @param {Function} callback
     * @param {Boolean} [useCapture]
     * @param {Function} [removeCallback]
     */
    addDraggableEventListener(eventName, callback, useCapture = true, removeCallback = () => {}) {
      // For item, always capture event, so we don't receive events from descendant nodes
      useCapture = true;
      return baseMixin.methods.addDraggableEventListener.call(
        this,
        eventName,
        callback,
        useCapture,
        removeCallback
      );
    },
  },
};
