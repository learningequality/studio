<template>

  <VList two-line>
    <!-- Select all checkbox -->
    <Checkbox
      v-model="selectAll"
      class="mb-2 ml-1 mt-0 px-3 py-2"
      :label="$tr('selectAllLabel')"
    />
    <EditListItems
      v-model="selected"
      :nodeId="parentId"
      :nodes="nodes"
      :nodeIds="nodeIds"
      @input="trackSelect"
      @removed="handleRemoved"
    />

  </VList>

</template>

<script>

  import { mapGetters } from 'vuex';
  import EditListItems from './EditListItems';
  import Checkbox from 'shared/views/form/Checkbox';

  export default {
    name: 'EditList',
    components: {
      EditListItems,
      Checkbox,
    },
    props: {
      value: {
        type: Array,
        default: () => [],
      },
      nodeIds: {
        type: Array,
        default: () => [],
      },
      parentId: {
        type: String,
        require: true,
        default: null,
      },
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode']),
      selected: {
        get() {
          return this.value;
        },
        set(items) {
          this.$emit('input', items);
        },
      },
      selectAll: {
        get() {
          return this.nodeIds.every(nodeId => this.selected.includes(nodeId));
        },
        set(value) {
          if (value) {
            this.selected = this.nodeIds;
            this.$analytics.trackAction('channel_editor_modal', 'Select all');
          } else {
            this.selected = [];
          }
        },
      },
      nodes() {
        const nodes = {};
        this.nodeIds.forEach(nodeId => {
          const parentId = this.getContentNode(nodeId).parent;
          nodes[`${nodeId}`] = this.nodeIds.includes(parentId) ? parentId : null;
        });
        return nodes;
      },
    },
    methods: {
      ...mapGetters('contentNode', ['deleteContentNode']),
      getChildren(parent) {
        const childrens = [];
        Object.keys(this.nodes).forEach(nodeId => {
          if (this.nodes[nodeId] === parent) {
            childrens.push(...this.getChildren(nodeId));
            childrens.push(nodeId);
          }
        });
        return childrens;
      },
      handleRemoved(nodeId) {
        const removedNodes = this.getChildren(nodeId);
        removedNodes.push(nodeId);
        removedNodes.forEach(nodeId => this.deleteContentNode(nodeId));
        const nodeIds = this.$route.params.detailNodeIds
          .split(',')
          .filter(id => !removedNodes.includes(id));
        this.$router.push({
          name: this.$route.name,
          params: {
            nodeId: this.$route.params.nodeId,
            detailNodeIds: nodeIds.join(','),
          },
        });
        if (this.selected.includes(nodeId)) {
          if (this.selected.length === 1) {
            const viableNodes = this.nodeIds.filter(id => id !== nodeId);
            this.selected = [viableNodes[viableNodes.length - 1]];
          } else {
            this.selected = this.selected.filter(id => id !== nodeId);
          }
        }
      },
      trackSelect() {
        this.$analytics.trackAction('channel_editor_modal', 'Select', {
          eventLabel: 'List item',
        });
      },
    },
    $trs: {
      selectAllLabel: 'Select all',
    },
  };

</script>

<style lang="less" scoped>

  .v-divider {
    margin-top: 0;
  }

</style>
