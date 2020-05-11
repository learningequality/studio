<template>

  <div>
    <VBreadcrumbs
      :items="breadcrumbsItems"
      divider=">"
    >
      <template v-slot:item="props">
        <span
          class="notranslate"
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
        'getContentNodeAncestors',
        'getContentNodeChildren',
      ]),
      selectedNode() {
        return this.getContentNode(this.selectedNodeId);
      },
      selectedNodeAncestors() {
        return this.getContentNodeAncestors(this.selectedNodeId, true) || [];
      },
      selectedNodeChildren() {
        return this.getContentNodeChildren(this.selectedNodeId) || [];
      },
      breadcrumbsItems() {
        const items = [
          ...this.selectedNodeAncestors.map(node => {
            return {
              nodeId: node.id,
              title: node.title,
              disabled: false,
            };
          }),
        ];
        if (items.length > 0) {
          items[items.length - 1].disabled = true;
        }

        return items;
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
      ...mapActions('contentNode', ['loadContentNode', 'loadAncestors', 'loadChildren']),
      onSelectionUpdate(nodeId) {
        this.loadContentNode(nodeId);

        if (this.selectedNode.has_children) {
          this.loadChildren({
            parent: nodeId,
            channel_id: this.channelId,
          });
        }

        this.loadAncestors({
          id: nodeId,
          channel_id: this.channelId,
          includeSelf: true,
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
