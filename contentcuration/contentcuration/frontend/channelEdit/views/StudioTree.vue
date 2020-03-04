<template>

  <VLayout row wrap>
    <VFlex
      v-if="node && !root"
      xs12
      class="node-item"
      :class="{ selected: selected }"
    >
      <VLayout row wrap>
        <VFlex xs6>
          <VLayout row wrap>
            <VFlex xs1>
              <VBtn v-if="showExpansion" icon @click.stop="toggle">
                <VIcon>{{ expanded ? "expand_more" : "expand_less" }}</VIcon>
              </VBtn>
            </VFlex>
            <VFlex xs11>
              <router-link :to="treeLink">
                <ContentNodeIcon :kind="node.kind" />
                <span>{{ node.title }}</span>
              </router-link>
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
      v-if="node && (root || node.has_children)"
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
      showExpansion() {
        return (
          this.node &&
          this.node.has_children &&
          (!this.children || this.children.some(c => c.kind === 'topic'))
        );
      },
      expanded() {
        return this.root || this.nodeExpanded(this.nodeId);
      },
      selected() {
        return this.nodeId === this.$route.params.nodeId;
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
      if (this.expanded || this.selected) {
        if (!this.node) {
          this.loadContentNode(this.nodeId).then(this.getChildren);
        } else {
          this.getChildren();
        }
      }
      if (this.selected) {
        // Always expand the selected node
        this.setExpansion({ id: this.nodeId, expanded: true });
      }
    },
    methods: {
      ...mapActions('contentNode', ['loadChildren', 'loadContentNode']),
      ...mapMutations('contentNode', {
        toggleExpansion: 'TOGGLE_EXPANSION',
        setExpansion: 'SET_EXPANSION',
      }),
      getChildren() {
        if (this.node && this.node.has_children) {
          return this.loadChildren({
            parent: this.nodeId,
            channel_id: this.$store.state.currentChannel.currentChannelId,
          });
        }
        return Promise.resolve();
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
