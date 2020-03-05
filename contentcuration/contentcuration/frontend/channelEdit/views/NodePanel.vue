<template>

  <VLayout row wrap>
    <VFlex
      v-if="node"
      xs12
    >
      <template
        v-for="child in children"
      >
        <VLayout :key="child.id" row wrap>
          <VFlex xs9>
            <router-link :to="treeLink(child)">
              <ContentNodeIcon :kind="child.kind" />
              <span>{{ child.title }}</span>
            </router-link>
          </VFlex>
          <VFlex xs1>
            <VBtn icon :to="editNodeLink(child.id)">
              <VIcon>edit</VIcon>
            </VBtn>
          </VFlex>
          <VFlex xs1>
            <VBtn icon @click="deleteContentNode(child.id)">
              <VIcon>clear</VIcon>
            </VBtn>
          </VFlex>
        </VLayout>
      </template>
    </VFlex>
  </VLayout>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import { RouterNames } from '../constants';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';

  export default {
    name: 'NodePanel',
    components: {
      ContentNodeIcon,
    },
    props: {
      parentId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeChildren']),
      node() {
        return this.getContentNode(this.parentId);
      },
      children() {
        return this.getContentNodeChildren(this.parentId);
      },
    },
    methods: {
      ...mapActions('contentNode', ['deleteContentNode']),
      editNodeLink(id) {
        return {
          name: RouterNames.VIEW_CONTENTNODES,
          params: {
            detailNodeIds: id,
          },
        };
      },
      treeLink(node) {
        if (node.kind === 'topic') {
          return {
            name: RouterNames.TREE_VIEW,
            params: {
              nodeId: node.id,
            },
          };
        }
        return {
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.parentId,
            detailNodeId: node.id,
          },
        };
      },
    },
  };

</script>

<style scoped>
</style>
