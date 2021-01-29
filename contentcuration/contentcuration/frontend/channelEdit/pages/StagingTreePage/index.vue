<template>

  <div :style="{ height: '100%' }">
    <ToolBar
      v-if="currentChannel"
      color="white"
      app
      clipped-left
      clipped-right
    >
      <VToolbarSideIcon @click="drawer = true" />
      <VToolbarTitle>
        {{ $tr('deploy') }} <span class="notranslate">{{ currentChannel.name }}</span>
        <router-link :to="rootTreeRoute" class="body-1 pl-2" data-test="root-tree-link">
          {{ $tr('backToViewing') }}
        </router-link>
      </VToolbarTitle>

      <VSpacer />
      <OfflineText indicator />
      <span class="grey--darken-2 grey--text">{{ $tr('reviewMode') }}</span>
    </ToolBar>
    <MainNavigationDrawer v-model="drawer" />
    <LoadingText v-if="isLoading" />
    <VContent v-else-if="isEmpty">
      <VLayout justify-center fill-height class="pt-5">
        <VFlex class="text-xs-center">
          <h1 class="font-weight-bold headline mb-2">
            {{ $tr('emptyChannelText') }}
          </h1>
          <p class="subheading">
            {{ $tr('emptyChannelSubText') }}
          </p>
        </VFlex>
      </VLayout>
    </VContent>

    <template v-else>
      <ResizableNavigationDrawer
        permanent
        clipped
        app
        localName="topic-staging-tree"
        class="hidden-xs-only"
        :maxWidth="400"
        :minWidth="200"
        :style="{
          backgroundColor: $vuetify.theme.backgroundColor,
          height: 'calc(100vh - 128px)',
          zIndex: 5,
        }"
      >
        <VLayout row class="px-3">
          <IconButton
            icon="collapseAll"
            :text="$tr('collapseAllButton')"
            @click="collapseAll"
          />
          <VSpacer />
          <IconButton
            :disabled="!ancestors || !ancestors.length"
            icon="myLocation"
            :text="$tr('openCurrentLocationButton')"
            @click="jumpToLocation"
          />
        </VLayout>
        <div class="px-3">
          <StudioTree
            :treeId="stagingId"
            :nodeId="stagingId"
            :selectedNodeId="nodeId"
            :onNodeClick="onTreeTopicClick"
            :root="true"
          />
        </div>
      </ResizableNavigationDrawer>

      <VContent :style="{ backgroundColor: 'white' }">
        <ToolBar
          v-if="breadcrumbsItems.length"
          dense
          color="transparent"
          :flat="!elevated"
          style="z-index: 4;"
        >
          <Breadcrumbs :items="breadcrumbsItems" class="pa-0">
            <template #item="{ item, isLast }">
              <span
                :class="[
                  isLast ? 'font-weight-bold text-truncate' : 'grey--text',
                  getTitleClass(item),
                ]"
              >
                {{ getTitle(item) }}
              </span>
            </template>
          </Breadcrumbs>
        </ToolBar>

        <VLayout class="main-content">
          <VFlex v-if="!children.length" class="pa-4 subheading text-xs-center">
            {{ $tr('emptyTopicText') }}
          </VFlex>
          <div v-else class="main-list" @scroll="scroll">
            <VList
              shrink
              class="pa-0"
              :style="{ backgroundColor: $vuetify.theme.backgroundColor }"
            >
              <template v-for="child in children">
                <ContentNodeListItem
                  :key="child.id"
                  :node="child"
                  :compact="isCompactViewMode"
                  data-test="node-list-item"
                  @topicChevronClick="goToTopic(child.id)"
                  @click.native="onNodeClick(child)"
                  @dblclick.native="onNodeClick(child)"
                >
                  <template #actions-start>
                    <VListTileAction style="width: 24px;" />
                  </template>
                  <template v-if="isTopic(child)" #actions-end>
                    <VListTileAction>
                      <IconButton
                        :color="$themeTokens.primary"
                        icon="info"
                        :text="$tr('viewDetails')"
                        data-test="btn-info"
                        size="small"
                        @click.stop.prevent="goToNodeDetail(child.id)"
                      />
                    </VListTileAction>
                  </template>
                </ContentNodeListItem>
              </template>
            </VList>
          </div>
          <ResourceDrawer
            :nodeId="detailNodeId"
            :channelId="currentChannel.id"
            class="grow"
            data-test="resource-detail-drawer"
            @close="closePanel"
          />
        </VLayout>
      </VContent>

      <BottomBar app>
        <VLayout align-center justify-space-between row fill-height wrap>
          <VFlex>
            <span class="pl-2" data-test="bottom-bar-stats-resources-count">
              {{ $tr('totalResources') }}:
              <span class="font-weight-bold">{{ resourcesCountStaged }}</span>
              <Diff :value="resourcesCountDiff" class="font-weight-bold">
                <template slot-scope="{ sign, value }">
                  ({{ sign }}{{ value ? value : '-' }})
                </template>
              </Diff>
            </span>
            <span class="pl-2" data-test="bottom-bar-stats-file-size">
              {{ $tr('totalSize') }}:
              <span class="font-weight-bold">{{ formatFileSize(fileSizeStaged) }}</span>
              <Diff :value="fileSizeDiff" class="font-weight-bold">
                <template slot-scope="{ sign, value }">
                  ({{ sign }}{{ value ? formatFileSize(value) : '-' }})
                </template>
              </Diff>
            </span>
          </VFlex>

          <VFlex class="bottom-bar-btns">
            <VDialog
              v-model="displaySummaryDetailsDialog"
              width="500"
            >
              <template v-slot:activator="{ on }">
                <VBtn
                  flat
                  data-test="display-summary-details-dialog-btn"
                  v-on="on"
                >
                  {{ $tr('openSummaryDetailsDialogBtn') }}
                </VBtn>
              </template>

              <VCard data-test="summary-details-dialog">
                <VCardTitle primary-title class="font-weight-bold title">
                  {{ $tr('summaryDetailsDialogTitle') }}
                </VCardTitle>
                <VCardText>
                  <DiffTable :stagingDiff="stagingDiff" @reload="reloadCurrentChannelStagingDiff" />
                </VCardText>
                <VCardActions>
                  <VSpacer />
                  <VBtn
                    color="primary"
                    @click="displaySummaryDetailsDialog = false"
                  >
                    {{ $tr('closeSummaryDetailsDialogBtn') }}
                  </VBtn>
                </VCardActions>
              </VCard>
            </VDialog>

            <VDialog
              v-model="displayDeployDialog"
              width="500"
            >
              <template v-slot:activator="{ on }">
                <VBtn
                  color="primary"
                  data-test="display-deploy-dialog-btn"
                  v-on="on"
                >
                  {{ $tr('deployChannel') }}
                </VBtn>
              </template>

              <VCard data-test="deploy-dialog">
                <VCardTitle primary-title class="font-weight-bold title">
                  {{ $tr('deployChannel') }}
                </VCardTitle>
                <VCardText>
                  <p>{{ $tr('deployDialogDescription') }}</p>

                  <VLayout data-test="deploy-dialog-live-resources">
                    <VFlex xs4 class="font-weight-bold">
                      {{ $tr('liveResources') }}:
                    </VFlex>
                    <VFlex>
                      {{ $tr('topicsCount', { count: topicsCountLive }) }},
                      {{ $tr('resourcesCount', { count: resourcesCountLive }) }}
                    </VFlex>
                  </VLayout>

                  <VLayout data-test="deploy-dialog-staged-resources">
                    <VFlex xs4 class="font-weight-bold">
                      {{ $tr('stagedResources') }}:
                    </VFlex>
                    <VFlex>
                      {{ $tr('topicsCount', { count: topicsCountStaged }) }},
                      {{ $tr('resourcesCount', { count: resourcesCountStaged }) }}
                    </VFlex>
                  </VLayout>
                </VCardText>
                <VCardActions>
                  <VSpacer />
                  <VBtn
                    flat
                    @click="displayDeployDialog = false"
                  >
                    {{ $tr('cancelDeployBtn') }}
                  </VBtn>
                  <VBtn
                    color="primary"
                    data-test="deploy-btn"
                    @click="onDeployChannelClick"
                  >
                    {{ $tr('confirmDeployBtn') }}
                  </VBtn>
                </VCardActions>
              </VCard>
            </VDialog>
          </VFLex>
        </VLayout>
      </BottomBar>
    </template>
  </div>

</template>


<script>

  import { mapGetters, mapMutations, mapActions } from 'vuex';

  import { RouterNames, viewModes } from '../../constants';

  import ContentNodeListItem from '../../components/ContentNodeListItem';
  import StudioTree from '../../components/StudioTree/StudioTree';
  import ResourceDrawer from '../../components/ResourceDrawer';
  import Diff from './Diff';
  import DiffTable from './DiffTable';
  import { fileSizeMixin, titleMixin, routerMixin } from 'shared/mixins';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import BottomBar from 'shared/views/BottomBar';
  import Breadcrumbs from 'shared/views/Breadcrumbs';
  import IconButton from 'shared/views/IconButton';
  import LoadingText from 'shared/views/LoadingText';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';
  import ToolBar from 'shared/views/ToolBar';
  import MainNavigationDrawer from 'shared/views/MainNavigationDrawer';
  import OfflineText from 'shared/views/OfflineText';

  export default {
    name: 'StagingTreePage',
    components: {
      BottomBar,
      Breadcrumbs,
      ContentNodeListItem,
      Diff,
      DiffTable,
      IconButton,
      LoadingText,
      ResizableNavigationDrawer,
      StudioTree,
      ResourceDrawer,
      ToolBar,
      MainNavigationDrawer,
      OfflineText,
    },
    mixins: [fileSizeMixin, titleMixin, routerMixin],
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
        isLoading: true,
        displaySummaryDetailsDialog: false,
        displayDeployDialog: false,
        drawer: false,
        elevated: false,
      };
    },
    computed: {
      ...mapGetters(['isCompactViewMode']),
      ...mapGetters('currentChannel', [
        'currentChannel',
        'rootId',
        'stagingId',
        'hasStagingTree',
        'getCurrentChannelStagingDiff',
      ]),
      ...mapGetters('contentNode', ['getContentNodeChildren', 'getContentNodeAncestors']),
      isEmpty() {
        return !this.hasStagingTree || !this.getContentNodeChildren(this.stagingId);
      },
      rootTreeRoute() {
        return {
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.rootId,
          },
        };
      },
      children() {
        return this.getContentNodeChildren(this.nodeId);
      },
      ancestors() {
        return this.getContentNodeAncestors(this.nodeId, true);
      },
      breadcrumbsItems() {
        if (!this.ancestors) {
          return [];
        }

        return this.ancestors.map(ancestor => {
          return {
            id: ancestor.id,
            title: ancestor.parent ? ancestor.title : this.currentChannel.name,
            to: {
              name: RouterNames.STAGING_TREE_VIEW,
              params: {
                nodeId: ancestor.id,
              },
            },
          };
        });
      },
      stagingDiff() {
        return this.getCurrentChannelStagingDiff;
      },
      topicsCountStaged() {
        return this.stagingDiff && this.stagingDiff.count_topics
          ? this.stagingDiff.count_topics.staged
          : 0;
      },
      topicsCountLive() {
        return this.stagingDiff && this.stagingDiff.count_topics
          ? this.stagingDiff.count_topics.live
          : 0;
      },
      resourcesCountStaged() {
        return this.stagingDiff && this.stagingDiff.count_resources
          ? this.stagingDiff.count_resources.staged
          : 0;
      },
      resourcesCountLive() {
        return this.stagingDiff && this.stagingDiff.count_resources
          ? this.stagingDiff.count_resources.live
          : 0;
      },
      resourcesCountDiff() {
        return this.resourcesCountStaged - this.resourcesCountLive;
      },
      fileSizeStaged() {
        return this.stagingDiff && this.stagingDiff.file_size_in_bytes
          ? this.stagingDiff.file_size_in_bytes.staged
          : 0;
      },
      fileSizeLive() {
        return this.stagingDiff && this.stagingDiff.file_size_in_bytes
          ? this.stagingDiff.file_size_in_bytes.live
          : 0;
      },
      fileSizeDiff() {
        return this.fileSizeStaged - this.fileSizeLive;
      },
    },
    watch: {
      nodeId(newNodeId) {
        this.elevated = false;
        this.loadAncestors({ id: newNodeId });
        this.loadChildren({ parent: newNodeId, root_id: this.stagingId });
      },
      detailNodeId(newDetailNodeId) {
        if (!newDetailNodeId) {
          this.removeViewModeOverride({
            id: 'staging-resource-drawer',
          });
          return;
        }

        this.addViewModeOverride({
          id: 'staging-resource-drawer',
          viewMode: viewModes.COMPACT,
        });
      },
      stagingId() {
        this.$router.push({
          name: RouterNames.STAGING_TREE_VIEW_REDIRECT,
        });
      },
    },
    created() {
      return this.loadCurrentChannel({ staging: true })
        .then(() => {
          if (!this.hasStagingTree) {
            this.isLoading = false;
            return;
          }
          Promise.all([
            this.loadAncestors({ id: this.nodeId }),
            this.loadChildren({ parent: this.nodeId, root_id: this.stagingId }),
          ]).then(() => {
            this.isLoading = false;
            this.loadCurrentChannelStagingDiff();
          });
        })
        .catch(error => {
          throw new Error(error);
        });
    },
    mounted() {
      this.updateTabTitle(this.$store.getters.appendChannelName(this.$tr('deployChannel')));
    },
    methods: {
      ...mapActions(['showSnackbar', 'addViewModeOverride', 'removeViewModeOverride']),
      ...mapActions('channel', ['loadChannel']),
      ...mapActions('currentChannel', [
        'loadCurrentChannelStagingDiff',
        'deployCurrentChannel',
        'reloadCurrentChannelStagingDiff',
      ]),
      ...mapActions('currentChannel', { loadCurrentChannel: 'loadChannel' }),
      ...mapActions('contentNode', ['loadAncestors', 'loadChildren']),
      ...mapMutations('contentNode', {
        collapseAll: 'COLLAPSE_ALL_EXPANDED',
        setExpanded: 'SET_EXPANSION',
      }),
      isTopic(node) {
        return node.kind === ContentKindsNames.TOPIC;
      },
      jumpToLocation() {
        this.ancestors.forEach(ancestor => {
          this.setExpanded({ id: ancestor.id, expanded: true });
        });
      },
      onTreeTopicClick(nodeId) {
        if (this.$route.params.nodeId === nodeId) {
          return;
        }
        this.goToTopic(nodeId);
      },
      goToNodeDetail(nodeId) {
        if (
          this.$route.params.nodeId === this.nodeId &&
          this.$route.params.detailNodeId === nodeId
        ) {
          return;
        }

        this.$router.push({
          name: RouterNames.STAGING_TREE_VIEW,
          params: {
            nodeId: this.nodeId,
            detailNodeId: nodeId,
          },
        });
      },
      goToTopic(topicId) {
        if (this.$route.params.nodeId === topicId && !this.$route.params.detailNodeId) {
          return;
        }

        this.$router.push({
          name: RouterNames.STAGING_TREE_VIEW,
          params: {
            nodeId: topicId,
            detailNodeId: null,
          },
        });
      },
      onNodeClick(node) {
        if (node.kind === ContentKindsNames.TOPIC) {
          this.goToTopic(node.id);
        } else {
          this.goToNodeDetail(node.id);
        }
      },
      closePanel() {
        this.$router.push({
          name: RouterNames.STAGING_TREE_VIEW,
          params: {
            nodeId: this.nodeId,
            detailNodeId: null,
          },
        });
      },
      scroll(e) {
        this.elevated = e.target.scrollTop > 0;
      },
      async onDeployChannelClick() {
        await this.deployCurrentChannel();
        await this.loadChannel(this.currentChannel.id);

        this.$router.push(this.rootTreeRoute);

        this.showSnackbar({
          text: this.$tr('channelDeployed'),
        });
      },
    },
    $trs: {
      deploy: 'Deploy',
      backToViewing: 'Back to viewing',
      reviewMode: 'Review mode',
      emptyChannelText: 'No resources found',
      emptyChannelSubText:
        'No changes to review! The channel contains all the latest topics and resources.',
      collapseAllButton: 'Collapse all',
      openCurrentLocationButton: 'Jump to current topic location',
      totalResources: 'Total resources',
      totalSize: 'Total size',
      openSummaryDetailsDialogBtn: 'View summary',
      closeSummaryDetailsDialogBtn: 'Close',
      summaryDetailsDialogTitle: 'Summary details',
      deployChannel: 'Deploy channel',
      deployDialogDescription: 'You are about to replace all live resources with staged resources.',
      liveResources: 'Live resources',
      stagedResources: 'Staged resources',
      topicsCount: '{count, number} {count, plural, one { topic } other { topics }}',
      resourcesCount: '{count, number} {count, plural, one { resource } other { resources }}',
      cancelDeployBtn: 'Cancel',
      confirmDeployBtn: 'Deploy channel',
      channelDeployed: 'Channel has been deployed',
      emptyTopicText: 'This topic is empty',
      viewDetails: 'View details',
    },
  };

</script>

<style lang="less" scoped>

  .main-content {
    height: calc(100vh - 176px);
  }

  .main-list {
    width: 100%;
    height: inherit;
    overflow-y: auto;
  }

  .bottom-bar-btns {
    flex-grow: 0;
  }

</style>
