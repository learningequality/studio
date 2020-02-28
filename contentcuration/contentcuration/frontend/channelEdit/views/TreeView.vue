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
    <ImportContentProgressModal
      v-if="showImportModal"
      :watchTaskId="$route.query.watchTask"
      @cancel="handleProgressCancel"
    />

    <RouterLink :to="importFromChannelsRoute">
      Import from channels
    </RouterLink>
  </div>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import { RouterNames } from '../constants';
  import StudioTree from './StudioTree';
  import NodePanel from './NodePanel';
  import ImportContentProgressModal from './ImportFromChannels/ImportContentProgressModal';

  export default {
    name: 'TreeView',
    components: {
      NodePanel,
      StudioTree,
      ImportContentProgressModal,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        showImportModal: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit', 'rootId']),
      importFromChannelsRoute() {
        return {
          name: 'IMPORT_FROM_CHANNELS_BROWSE',
          params: {
            destNodeId: this.$route.params.nodeId,
          },
        };
      },
    },
    mounted() {
      if (this.$route.query.watchTask) {
        this.showImportModal = true;
      }
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
      handleProgressCancel() {
        this.showImportModal = false;
        this.$router.replace({
          query: {},
        });
        // FIXME refreshing page doesn't reload the latest resources
        this.$router.go(0);
      },
    },
    $trs: {
      addNode: 'Add node',
    },
  };

</script>


<style lang="less" scoped>

</style>
