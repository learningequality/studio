import { mapActions, mapGetters } from 'vuex';
import uniq from 'lodash/uniq';
import { SelectionFlags } from 'frontend/channelEdit/vuex/clipboard/constants';

export default {
  props: {
    nodeId: {
      type: String,
      required: true,
    },
    sourceId: {
      type: String,
    },
  },
  computed: {
    ...mapGetters('contentNode', ['getContentNode', 'getTreeNode']),
    ...mapGetters('clipboard', [
      'currentSelectionState',
      'getNextSelectionState',
      'getClipboardChildren',
    ]),
    treeNode() {
      return this.getTreeNode(this.nodeId);
    },
    contentNode() {
      return this.sourceId ? this.getContentNode(this.sourceId) : null;
    },
    indentPadding() {
      const level = this.treeNode.level || 0;
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
  mounted() {
    // if (this.$refs.checkbox) {
    //   this.$refs.checkbox.$on('change', () => {
    //     window.event.preventDefault();
    //   });
    // }
  },
  methods: {
    ...mapActions('clipboard', ['setSelectionState', 'resetSelectionState']),
    goNextSelectionState() {
      this.setSelectionState({ id: this.nodeId, selectionState: this.nextSelectionState });
    },
  },
};

export const parentMixin = {
  computed: {
    ...mapGetters('contentNode', [
      'hasChildren',
      'getTreeNodeChildren',
      'countTreeNodeDescendants',
    ]),
    ...mapGetters('clipboard', ['channelIds', 'getClipboardChildren']),
    treeChildren() {
      return this.getClipboardChildren(this.nodeId);
    },
    childrenSourceIds() {
      return this.treeChildren.map(child => child.source_id);
    },
    descendantCount() {
      return this.countTreeNodeDescendants(this.nodeId);
    },
  },
  mounted() {
    const ids = uniq(this.childrenSourceIds);

    if (ids.length) {
      this.loadContentNodes({ ids });
    }
  },
  methods: {
    ...mapActions('contentNode', ['loadContentNodes']),
  },
};
