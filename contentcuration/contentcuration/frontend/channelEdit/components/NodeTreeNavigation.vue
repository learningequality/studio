<template>

  <div>
    <Breadcrumbs :items="breadcrumbsItems">
      <template #item="{ item }">
        <span
          :class="[breadcrumbsItemClasses(item), getTitleClass(item)]"
          @click="onBreadcrumbsItemClick(item)"
        >
          {{ getTitle(item) }}
        </span>
      </template>
    </Breadcrumbs>
    <VContainer v-if="loading">
      <LoadingText />
    </VContainer>
    <VList v-else-if="selectedNodeChildren.length">
      <template v-for="child in selectedNodeChildren">
        <VDivider :key="`divider-${child.id}`" />
        <slot
          name="child"
          :childNode="child"
        ></slot>
      </template>
    </VList>
    <VLayout
      v-else
      class="pa-4"
    >
      <p class="grey--text subheading">
        {{ $tr('noResourcesDefaultText') }}
      </p>
    </VLayout>
  </div>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import Breadcrumbs from 'shared/views/Breadcrumbs';
  import LoadingText from 'shared/views/LoadingText';
  import { titleMixin } from 'shared/mixins';

  export default {
    name: 'NodeTreeNavigation',
    components: {
      Breadcrumbs,
      LoadingText,
    },
    mixins: [titleMixin],
    model: {
      prop: 'selectedNodeId',
      event: 'updateSelectedNodeId',
    },
    props: {
      selectedNodeId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        loading: false,
      };
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
        this.onSelectionUpdate(newSelectedNodeId);
      },
    },
    created() {
      this.onSelectionUpdate(this.selectedNodeId);
    },
    methods: {
      ...mapActions('contentNode', ['loadContentNode', 'loadAncestors', 'loadChildren']),
      onSelectionUpdate(nodeId) {
        this.loading = true;
        const promises = [
          this.loadContentNode(nodeId),
          this.loadAncestors({
            id: nodeId,
          }),
        ];

        if (this.selectedNode.has_children) {
          promises.push(
            this.loadChildren({
              parent: nodeId,
            }),
          );
        }
        Promise.all(promises).then(() => (this.loading = false));
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
    $trs: {
      noResourcesDefaultText: 'No resources found',
    },
  };

</script>


<style lang="scss" scoped>

  .breadcrumbs-item.primary--text {
    text-decoration: underline;

    &:hover {
      cursor: pointer;
    }
  }

</style>
