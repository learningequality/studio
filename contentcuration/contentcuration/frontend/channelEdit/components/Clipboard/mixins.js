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
    const id__in = uniq(this.childrenSourceIds);

    // Prefetch content node data. Since we're using `lazy` with the
    // nested VListGroup, this prefetches one level at a time!
    if (id__in.length) {
      this.$nextTick(() => this.loadContentNodes({ id__in }));
    }
  },
  methods: {
    ...mapActions('contentNode', ['loadContentNodes']),
  },
};
