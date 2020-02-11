<template>

  <div>
    <VBtn
      v-if="canEdit"
      color="primary"
      fixed
      right
      fab
      :title="$tr('addNode')"
      @click="newContentNode"
    >
      <VIcon>add</VIcon>
    </VBtn>
    <VLayout row wrap>
      <VFlex xs6>
        <StudioTree :nodeId="rootId" :root="true" />
      </VFlex>
      <VFlex xs6>
        <NodePanel :parentId="nodeId" />
      </VFlex>
    </VLayout>
    <router-view />
  </div>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import { RouterNames } from '../constants';
  import StudioTree from './StudioTree';
  import NodePanel from './NodePanel';

  export default {
    name: 'TreeView',
    components: {
      NodePanel,
      StudioTree,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit', 'rootId']),
    },
    methods: {
      ...mapActions('contentNode', ['createContentNode']),
      newContentNode() {
        this.createContentNode({ parent: this.nodeId }).then(newId => {
          this.$router.push({
            name: RouterNames.CONTENTNODE_DETAILS,
            params: { detailNodeId: newId },
          });
        });
      },
    },
    $trs: {
      addNode: 'Add node',
    },
  };

</script>


<style lang="less" scoped>

</style>
