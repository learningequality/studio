<template>

  <VContainer fluid class="pa-0 fill-height">
    <ResizableNavigationDrawer
      v-show="!isEmptyChannel"
      ref="hierarchy"
      permanent
      clipped
      localName="topic-tree"
      class="hidden-xs-only"
      :maxWidth="400"
      :minWidth="200"
      :style="{backgroundColor: $vuetify.theme.backgroundColor}"
    >
      <VLayout row>
        <IconButton
          icon="collapse_all"
          :text="$tr('collapseAllButton')"
          @click="collapseAll"
        >
          $vuetify.icons.collapse_all
        </IconButton>
        <VSpacer />
        <IconButton
          :disabled="!ancestors.length"
          icon="gps_fixed"
          :text="$tr('openCurrentLocationButton')"
          @click="jumpToLocation"
        />
      </VLayout>
      <div style="margin-left: -24px;">
        <StudioTree :nodeId="rootId" :root="true" />
      </div>
    </ResizableNavigationDrawer>
    <VContainer fluid class="pa-0 ma-0" style="height: calc(100vh - 64px);">
      <CurrentTopicView :topicId="nodeId" :detailNodeId="detailNodeId" />
    </VContainer>
    <router-view />
    <ImportContentProgressModal
      v-if="showImportModal"
      :watchTaskId="$route.query.watchTask"
      @cancel="handleProgressCancel"
    />
  </VContainer>

</template>


<script>

  import { mapGetters, mapMutations } from 'vuex';
  import StudioTree from './StudioTree';
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
      ...mapGetters('currentChannel', ['rootId']),
      ...mapGetters('contentNode', ['getContentNodeChildren', 'getContentNodeAncestors']),
      isEmptyChannel() {
        return !this.getContentNodeChildren(this.rootId).length;
      },
      ancestors() {
        return this.getContentNodeAncestors(this.nodeId);
      },
    },
    mounted() {
      if (this.$route.query.watchTask) {
        this.showImportModal = true;
      }
    },
    methods: {
      ...mapMutations('contentNode', {
        collapseAll: 'COLLAPSE_ALL_EXPANDED',
        setExpanded: 'SET_EXPANSION',
      }),
      jumpToLocation() {
        this.ancestors.forEach(ancestor => {
          this.setExpanded({ id: ancestor.id, expanded: true });
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
      openCurrentLocationButton: 'Open to current location',
    },
  };

</script>


<style lang="less" scoped>

</style>
