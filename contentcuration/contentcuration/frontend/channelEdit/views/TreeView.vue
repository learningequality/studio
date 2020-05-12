<template>

  <VContainer fluid class="pa-0">
    <Banner v-model="hasStagingTree" border>
      <VLayout align-center justify-start>
        <Icon>build</Icon>
        <span class="pl-1">
          <router-link :to="stagingTreeLink" :style="{'text-decoration': 'underline'}">
            {{ $tr('updatedResourcesReadyForReview') }}
          </router-link>
          ({{ channelModifiedDate }})
        </span>
      </VLayout>
    </Banner>
    <VLayout row>
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
          <StudioTree
            :treeId="rootId"
            :nodeId="rootId"
            :root="true"
            @click="onTreeNodeClick"
          />
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
    </VLayout>
  </VContainer>

</template>


<script>

  import { mapGetters, mapMutations } from 'vuex';

  import { RouterNames } from '../constants';

  import StudioTree from './StudioTree';
  import ImportContentProgressModal from './ImportFromChannels/ImportContentProgressModal';
  import CurrentTopicView from './CurrentTopicView';
  import Banner from 'shared/views/Banner';
  import IconButton from 'shared/views/IconButton';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';

  export default {
    name: 'TreeView',
    components: {
      StudioTree,
      ImportContentProgressModal,
      Banner,
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
      ...mapGetters('currentChannel', ['currentChannel', 'hasStagingTree', 'stagingId', 'rootId']),
      ...mapGetters('contentNode', ['getContentNodeChildren', 'getContentNodeAncestors']),
      isEmptyChannel() {
        return !this.getContentNodeChildren(this.rootId).length;
      },
      ancestors() {
        return this.getContentNodeAncestors(this.nodeId);
      },
      stagingTreeLink() {
        return {
          name: RouterNames.STAGING_TREE_VIEW,
          params: {
            nodeId: this.stagingId,
          },
        };
      },
      channelModifiedDate() {
        return this.$formatDate(this.currentChannel.modified, {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
        });
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
      onTreeNodeClick(nodeId) {
        if (this.$route.params.nodeId === nodeId) {
          return;
        }
        this.$router.push({
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId,
          },
        });
      },
    },
    $trs: {
      collapseAllButton: 'Collapse all',
      openCurrentLocationButton: 'Open to current location',
      updatedResourcesReadyForReview: 'Updated resources are ready for review',
    },
  };

</script>


<style lang="less" scoped>

</style>
