<template>

  <VContainer fluid class="pa-0 fill-height">
    <ResizableNavigationDrawer
      permanent
      clipped
      localName="topic-tree"
      :maxWidth="700"
      :minWidth="175"
      :style="{backgroundColor: $vuetify.theme.backgroundColor}"
    >
      <VToolbar dense flat color="backgroundColor">
        <IconButton icon="collapse_all" :text="$tr('collapseAllButton')">
          $vuetify.icons.collapse_all
        </IconButton>
        <VSpacer />
      </VToolbar>
      <div style="margin-left: -24px;">
        <StudioTree :nodeId="rootId" :root="true" />
      </div>
    </ResizableNavigationDrawer>
    <CurrentTopicView :topicId="nodeId" :detailNodeId="detailNodeId" />
    <router-view />
    <ImportContentProgressModal
      v-if="showImportModal"
      :watchTaskId="$route.query.watchTask"
      @cancel="handleProgressCancel"
    />

    <RouterLink :to="importFromChannelsRoute">
      Import from channels
    </RouterLink>
  </VContainer>

</template>


<script>

  import { mapGetters } from 'vuex';
  import StudioTree from './StudioTree';
  import NodePanel from './NodePanel';
  import ImportContentProgressModal from './ImportFromChannels/ImportContentProgressModal';
  import CurrentTopicView from './CurrentTopicView';
  import IconButton from 'shared/views/IconButton';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';

  export default {
    name: 'TreeView',
    components: {
      StudioTree,
      ImportContentProgressModal,
      IconButton,
      ResizableNavigationDrawer,
      CurrentTopicView,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      detailNodeId: {
        type: String,
        required: false,
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
      collapseAllButton: 'Collapse all',
    },
  };

</script>


<style lang="less" scoped>

</style>
