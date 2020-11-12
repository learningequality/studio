import { mapActions, mapGetters, mapState } from 'vuex';
import containerMixin from './container';
import { DraggableTypes } from 'shared/mixins/draggable/constants';

export default {
  mixins: [containerMixin],
  inject: {
    draggableUniverse: { default: null },
    draggableAncestors: { default: () => [] },
  },
  props: {
    draggableType: {
      default: DraggableTypes.COLLECTION,
    },
  },
  computed: {
    ...mapState('draggable/collections', ['hoverDraggableSection']),
    ...mapGetters('draggable/collections', [
      'activeDraggableId',
      'hoverDraggableId',
      'draggingTargetSection',
      'isHoverDraggableAncestor',
    ]),
  },
  methods: {
    ...mapActions('draggable/collections', [
      'setHoverDraggable',
      'updateHoverDraggable',
      'resetHoverDraggable',
      'setActiveDraggableSize',
    ]),
  },
};
