<template>

  <VLayout row wrap>
    <VFlex
      v-if="!root"
      xs12
      class="node-item"
      :class="{ selected: selected }"
    >
      <VLayout row wrap>
        <VFlex xs6>
          <VLayout row wrap>
            <VFlex xs1>
              <VBtn v-if="node.has_children" icon @click.stop="toggle">
                <VIcon>{{ expanded ? "expand_more" : "expand_less" }}</VIcon>
              </VBtn>
            </VFlex>
            <VFlex xs10>
              <router-link :to="treeLink">
                <ContentNodeIcon :kind="node.kind" />
                <span>{{ node.title }}</span>
              </router-link>
            </VFlex>
            <VFlex xs1>
              <VBtn icon :to="editNodeLink">
                <VIcon>edit</VIcon>
              </VBtn>
            </VFlex>
          </VLayout>
        </VFlex>
        <VSpacer />
        <VFlex xs1>
          <VProgressCircular
            v-if="loading"
            indeterminate
            size="15"
            width="2"
          />
        </VFlex>
      </VLayout>
    </VFlex>
    <VFlex
      v-if="root || node.has_children"
      v-show="expanded"
      xs12
      class="subtree"
      transition="slide-y-transition"
    >
      <StudioTree
        v-for="child in children"
        v-show="child.kind === 'topic'"
        :key="child.id"
        :nodeId="child.id"
      />
    </VFlex>
  </VLayout>

</template>

<script>

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import { RouterNames } from '../constants';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';

  export default {
    name: 'StudioTree',
    components: {
      ContentNodeIcon,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      root: {
        type: Boolean,
        default: false,
      },
    },
    data: () => {
      return {
        loading: false,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeChildren', 'nodeExpanded']),
      node() {
        return this.getContentNode(this.nodeId);
      },
      children() {
        return this.getContentNodeChildren(this.nodeId);
      },
      expanded() {
        return this.root || this.nodeExpanded(this.nodeId);
      },
      selected() {
        return this.nodeId === this.$route.params.nodeId;
      },
      editNodeLink() {
        return {
          name: RouterNames.CONTENTNODE_DETAILS,
          params: {
            detailNodeId: this.nodeId,
          },
        };
      },
      treeLink() {
        return {
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.nodeId,
          },
        };
      },
    },
    created() {
      if (this.expanded) {
        if (!this.node) {
          const loadChildren = () => {
            const getChildrenPromise = this.getChildren();
            if (getChildrenPromise || (this.node && !this.node.has_children)) {
              unwatch();
            }
          };
          const unwatch = this.$watch('node', loadChildren);
        } else {
          this.getChildren();
        }
      }
    },
    methods: {
      ...mapActions('contentNode', ['loadContentNodes']),
      ...mapMutations('contentNode', { toggleExpansion: 'TOGGLE_EXPANSION' }),
      getChildren() {
        if (this.node && this.node.has_children) {
          return this.loadContentNodes({ parent: this.nodeId });
        }
      },
      toggle() {
        if (this.root || this.node.has_children) {
          const currentlyExpanded = this.expanded;
          this.toggleExpansion(this.nodeId);
          if (!currentlyExpanded && !this.children.length) {
            return this.getChildren();
          }
        }
        return Promise.resolve();
      },
    },
  };

</script>

<style scoped>
.subtree {
  padding-left: 10px;
}
.node-item {
  padding: 5px;
  padding-left: 10px;
  cursor: pointer;
  border-left: 3px solid transparent;
}
.selected {
  border-color: gray;
}
</style>