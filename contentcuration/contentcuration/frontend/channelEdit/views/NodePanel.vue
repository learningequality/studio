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
          <VFlex xs10>
            <router-link :to="treeLink(child.id)">
              <ContentNodeIcon :kind="child.kind" />
              <span>{{ child.title }}</span>
            </router-link>
          </VFlex>
          <VFlex xs1>
            <VBtn icon :to="editNodeLink(child.id)">
              <VIcon>edit</VIcon>
            </VBtn>
          </VFlex>
        </VLayout>
      </template>
    </VFlex>
  </VLayout>

</template>

<script>

  import { mapGetters } from 'vuex';
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
      editNodeLink(id) {
        return {
          name: RouterNames.CONTENTNODE_DETAILS,
          params: {
            detailNodeId: id,
          },
        };
      },
      treeLink(id) {
        return {
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: id,
          },
        };
      },
    },
  };

</script>

<style scoped>

</style>