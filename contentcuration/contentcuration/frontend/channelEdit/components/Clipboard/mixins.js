import { mapActions, mapGetters } from 'vuex';
import { SelectionFlags } from 'frontend/channelEdit/vuex/clipboard/constants';

export default {
  props: {
    nodeId: {
      type: String,
      required: true,
    },
    level: {
      type: Number,
      default: 0,
    },
  },
  computed: {
    ...mapGetters('clipboard', [
      'getContentNodeForRender',
      'getSelectionState',
      'getNextSelectionState',
      'getClipboardChildren',
      'currentSelectionState',
    ]),
    ...mapGetters('currentChannel', ['canEdit']),
    contentNode() {
      return this.nodeId ? this.getContentNodeForRender(this.nodeId) : null;
    },
    indentPadding() {
      return `${this.level * 32}px`;
    },
    selectionState() {
      return this.currentSelectionState(this.nodeId);
    },
    nextSelectionState() {
      return this.getNextSelectionState(this.nodeId);
    },
    selected() {
      return Boolean(this.selectionState & SelectionFlags.SELECTED);
    },
    indeterminate() {
      return Boolean(this.selectionState & SelectionFlags.INDETERMINATE);
    },
    allowMove() {
      // Allow move (aka, copy and remove from clipboard) when current channel is editable
      return this.canEdit;
    },
  },
  methods: {
    ...mapActions('clipboard', ['setSelectionState', 'resetSelectionState']),
    goNextSelectionState() {
      this.setSelectionState({
        id: this.nodeId,
        selectionState: this.nextSelectionState,
      });
    },
  },
};

export const parentMixin = {
  props: {
    nodeId: {
      type: String,
      required: true,
    },
    level: {
      type: Number,
      default: 0,
    },
  },
  computed: {
    ...mapGetters('clipboard', [
      'channelIds',
      'getClipboardChildren',
      'isClipboardNode',
    ]),
    children() {
      return this.getClipboardChildren(this.nodeId);
    },
  },
  methods: {
    ...mapActions('clipboard', [
      'loadClipboardNodes',
      'preloadClipboardNodes',
      'cancelPreloadClipboardNodes',
    ]),
  },
};
