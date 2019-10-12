<template>

  <div>
    <VTreeview v-if="nodes.length" :items="nodes" item-text="title" :selectable="true" :load-children="fetchChildren">
      <template v-slot:label="{ item }">
        <VBtn :to="editNodeLink(item.id)">
          <ContentNodeIcon :kind="item.kind" />
          <span>{{ item.title }}</span>
        </VBtn>
      </template>
    </VTreeview>
    <router-view/>
  </div>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import { RouterNames } from '../constants';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';

  export default {
    name: 'TreeView',
    components: {
      ContentNodeIcon
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNodeChildren']),
      nodes() {
        // The root nodes for the tree view
        return this.getContentNodeChildren(this.nodeId);
      },
    },
    created() {
      return this.loadSummaryContentNodes({parent: this.nodeId});
    },
    methods: {
      ...mapActions('contentNode', ['loadSummaryContentNodes']),
      fetchChildren(node) {
        return this.loadSummaryContentNodes({ parent: node.id }).then(nodes => {
          node.children.push(...nodes);
          return nodes;
        });
      },
      editNodeLink(id) {
        return {
          name: RouterNames.CONTENTNODE_DETAILS,
          params: {
            nodeId: id,
          },
        };
      }
    }
  };

</script>


<style lang="less" scoped>

</style>
