<template>
  <VLayout row wrap>
    <VFlex
      @click="setSelected(node)"
      xs12
      class="node-item"
      :class="{ selected: selected }"
      v-if="!root"
    >
      <VLayout row wrap>
        <VFlex xs9>
          <ContentNodeIcon :kind="node.kind" />
          <span>{{ node.title }}</span>
          <VBtn icon :to="editNodeLink(node.id)">
            <VIcon>edit</VIcon>
          </VBtn>
        </VFlex>
        <VSpacer />
        <VFlex xs1>
          <VProgressCircular
            indeterminate
            size="15"
            width="2"
            v-if="loading"
          />
        </VFlex>
        <VFlex xs1 v-if="node.has_children" @click.stop="toggle">
          <VIcon>{{ expanded ? "expand_more" : "expand_less" }}</VIcon>
        </VFlex>
      </VLayout>
    </VFlex>
    <VFlex
      xs12
      class="subtree"
      v-if="root || node.has_children"
      v-show="expanded"
      transition="slide-y-transition"
    >
      <StudioTree
        v-for="child in children"
        :key="child.id"
        :nodeId="child.id"
        :selected="selected"
        @selected="setSelected"
      />
    </VFlex>
  </VLayout>
</template>

<script>

import { mapActions, mapGetters } from 'vuex';
import { RouterNames } from '../constants';
import ContentNodeIcon from 'shared/views/ContentNodeIcon';

export default {
  name: "StudioTree",
  components: {
    ContentNodeIcon,
  },
  data: () => {
    return {
      loading: false,
      expanded: false
    };
  },
  props: {
    nodeId: {
      type: String,
      required: true
    },
    selected: {
      type: Boolean,
      default: false
    },
    root: {
      type: Boolean,
      default: false,
    }
  },
  beforeRouteEnter() {
    if (this.root) {
      this.toggle();
    }
  },
  computed: {
    ...mapGetters('contentNode', ['getContentNode', 'getContentNodeChildren']),
    node() {
      return this.getContentNode(this.nodeId);
    },
    children() {
      return this.getContentNodeChildren(this.nodeId);
    },
  },
  methods: {
    ...mapActions('contentNode', ['loadSummaryContentNodes']),
    getChildren() {
      return this.loadSummaryContentNodes({ parent: this.nodeId });
    },
    toggle() {
      if (this.root || this.node.has_children) {
        this.expanded = !this.expanded;
        if (this.expanded && this.node.has_children && !this.children.length) {
          this.getChildren();
        }
      }
    },
    setSelected(node) {
      this.$emit("selected", node);
    },
    editNodeLink(id) {
      return {
        name: RouterNames.CONTENTNODE_DETAILS,
        params: {
          detailNodeId: id,
        },
      };
    }
  }
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