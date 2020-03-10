<template>

  <div>
    <VBreadcrumbs
      :items="breadcrumbsItems"
      divider=">"
    >
      <template v-slot:item="props">
        <span
          :class="breadcrumbsItemClasses(props.item)"
          @click="onBreadcrumbsItemClick(props.item)"
        >
          {{ props.item.title }}
        </span>
      </template>
    </VBreadcrumbs>

    <VList>
      <template v-for="child in selectedNodeChildren">
        <VDivider :key="`divider-${child.id}`" />

        <slot
          name="child"
          :childNode="child"
        ></slot>
      </template>
    </VList>
  </div>

</template>

<script>

  import { mapGetters, mapActions } from 'vuex';

  export default {
    name: 'NodeTreeNavigation',
    model: {
      prop: 'selectedNodeId',
      event: 'updateSelectedNodeId',
    },
    props: {
      channelId: {
        type: String,
        required: true,
      },
      selectedNodeId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('contentNode', [
        'getContentNode',
        'getContentNodeParents',
        'getContentNodeChildren',
      ]),
      selectedNode() {
        return this.getContentNode(this.selectedNodeId);
      },
      selectedNodeParents() {
        return this.getContentNodeParents(this.selectedNodeId) || [];
      },
      selectedNodeChildren() {
        return this.getContentNodeChildren(this.selectedNodeId) || [];
      },
      breadcrumbsItems() {
        return [
          ...this.selectedNodeParents
            .map(node => {
              return {
                nodeId: node.id,
                title: node.title,
                disabled: false,
              };
            })
            .reverse(),
          {
            nodeId: this.selectedNodeId,
            title: this.selectedNode ? this.selectedNode.title : '',
            disabled: true,
          },
        ];
      },
    },
    watch: {
      selectedNodeId(newSelectedNodeId) {
        if (newSelectedNodeId === this.selectedNodeId) {
          return;
        }

        this.onSelectionUpdate(newSelectedNodeId);
      },
    },
    created() {
      this.onSelectionUpdate(this.selectedNodeId);
    },
    methods: {
      ...mapActions('contentNode', ['loadContentNode', 'loadParents', 'loadChildren']),
      onSelectionUpdate(nodeId) {
        this.loadContentNode(nodeId);

        if (this.selectedNode.has_children) {
          this.loadChildren({
            parent: nodeId,
            channel_id: this.channelId,
          });
        }

        this.loadParents({
          id: nodeId,
          channel_id: this.channelId,
        });
      },
      breadcrumbsItemClasses(item) {
        const classes = ['breadcrumbs-item'];

        if (!item.disabled) {
          classes.push('primary--text');
        }

        return classes;
      },
      onBreadcrumbsItemClick(item) {
        this.$emit('updateSelectedNodeId', item.nodeId);
      },
    },
  };

</script>

<style lang="less" scoped>

  .breadcrumbs-item.primary--text {
    text-decoration: underline;

    &:hover {
      cursor: pointer;
    }
  }

</style>
