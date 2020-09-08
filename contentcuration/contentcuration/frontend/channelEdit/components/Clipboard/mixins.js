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
      'getClipboardNodeForRender',
      'currentSelectionState',
      'getNextSelectionState',
      'getClipboardChildren',
    ]),
    contentNode() {
      return this.nodeId ? this.getClipboardNodeForRender(this.nodeId) : null;
    },
    indentPadding() {
      const level = this.contentNode ? this.contentNode.level : 0;
      return `${level * 32}px`;
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
  },
  methods: {
    ...mapActions('clipboard', ['setSelectionState', 'resetSelectionState']),
    goNextSelectionState() {
      this.setSelectionState({ id: this.nodeId, selectionState: this.nextSelectionState });
    },
  },
};

export const parentMixin = {
  props: {
    level: {
      type: Number,
      default: 0,
    },
  },
  computed: {
    ...mapGetters('clipboard', ['channelIds', 'getClipboardChildren', 'hasClipboardChildren']),
    children() {
      return this.getClipboardChildren(this.nodeId);
    },
  },
  methods: {
    ...mapActions('clipboard', ['loadClipboardNodes']),
  },
};
