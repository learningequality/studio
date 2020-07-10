<template>

  <VContainer fluid fill-height class="pa-0">
    <LoadingText v-if="isLoading" />
    <VLayout
      v-else-if="isEmpty"
      justify-center
      fill-height
      style="padding-top: 10%;"
    >
      <VFlex class="text-xs-center">
        <h1 class="headline font-weight-bold mb-2">
          {{ $tr('emptyChannelText') }}
        </h1>
        <p class="subheading">
          {{ $tr('emptyChannelSubText') }}
        </p>
      </VFlex>
    </VLayout>

    <VLayout v-else row>
      <ResizableNavigationDrawer
        permanent
        clipped
        localName="topic-staging-tree"
        class="hidden-xs-only"
        :maxWidth="400"
        :minWidth="200"
        :style="{ backgroundColor: $vuetify.theme.backgroundColor }"
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
            :treeId="stagingId"
            :nodeId="stagingId"
            :selectedNodeId="nodeId"
            :onNodeClick="onTreeTopicClick"
            :root="true"
          />
        </div>
      </ResizableNavigationDrawer>

      <VContainer fluid class="pa-0 ma-0" :style="{ backgroundColor: 'white' }">
        <VToolbar v-if="breadcrumbsItems.length" dense color="transparent" flat>
          <Breadcrumbs :items="breadcrumbsItems" class="pa-0">
            <template #item="props">
              <span
                class="notranslate"
                :class="[props.isLast ? 'font-weight-bold text-truncate' : 'grey--text']"
              >
                {{ props.item.title }}
              </span>
            </template>
          </Breadcrumbs>
        </VToolbar>

        <VLayout>
          <VList
            shrink
            class="pa-0"
            :style="{width: '100%', backgroundColor: $vuetify.theme.backgroundColor}"
          >
            <template v-for="child in children">
              <ContentNodeListItem
                :key="child.id"
                :node="child"
                :compact="isCompactViewMode"
                @infoClick="goToNodeDetail(child.id)"
                @topicChevronClick="goToTopic(child.id)"
                @click.native="onNodeClick(child)"
                @dblclick.native="onNodeClick(child)"
              />
            </template>
          </VList>

          <ResourceDrawer
            :nodeId="detailNodeId"
            :channelId="currentChannel.id"
            class="grow"
            @close="closePanel"
          />
        </VLayout>
      </VContainer>

      <BottomBar>
        <VLayout align-center justify-space-between row fill-height wrap>
          <VFlex>
            <span class="pl-2">
              {{ $tr('totalResources') }}:
              <span class="font-weight-bold">{{ resourcesCountStaged }}</span>
              <Diff :value="resourcesCountDiff" class="font-weight-bold">
                <template slot-scope="{ sign, value }">
                  ({{ sign }}{{ value ? value : '-' }})
                </template>
              </Diff>
            </span>
            <span class="pl-2">
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
              v-model="displayDiffDialog"
              width="500"
            >
              <template v-slot:activator="{ on }">
                <VBtn
                  flat
                  v-on="on"
                >
                  {{ $tr('openDiffDialogBtn') }}
                </VBtn>
              </template>

              <VCard>
                <VCardTitle primary-title class="title font-weight-bold">
                  {{ $tr('diffDialogTitle') }}
                </VCardTitle>
                <VCardText>
                  <DiffTable :stagingDiff="stagingDiff" />
                </VCardText>
                <VDivider />
                <VCardActions>
                  <VSpacer />
                  <VBtn
                    color="primary"
                    @click="displayDiffDialog = false"
                  >
                    {{ $tr('closeDiffDialogBtn') }}
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
                  v-on="on"
                >
                  {{ $tr('deployChannel') }}
                </VBtn>
              </template>

              <VCard>
                <VCardTitle primary-title class="title font-weight-bold">
                  {{ $tr('deployChannel') }}
                </VCardTitle>
                <VCardText>
                  <p>{{ $tr('deployDialogDescription') }}</p>

                  <VLayout>
                    <VFlex xs4 class="font-weight-bold">
                      {{ $tr('liveResources') }}:
                    </VFlex>
                    <VFlex>
                      {{ $tr('topicsCount', { count: topicsCountLive }) }},
                      {{ $tr('resourcesCount', { count: resourcesCountLive }) }}
                    </VFlex>
                  </VLayout>

                  <VLayout>
                    <VFlex xs4 class="font-weight-bold">
                      {{ $tr('stagedResources') }}:
                    </VFlex>
                    <VFlex>
                      {{ $tr('topicsCount', { count: topicsCountStaged }) }},
                      {{ $tr('resourcesCount', { count: resourcesCountStaged }) }}
                    </VFlex>
                  </VLayout>
                </VCardText>

                <VDivider />

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
    </VLayout>
  </VContainer>

</template>


<script>

  import { mapGetters, mapMutations, mapActions } from 'vuex';

  import { RouterNames, viewModes } from '../../constants';

  import ContentNodeListItem from '../../components/ContentNodeListItem';
  import StudioTree from '../../components/StudioTree/StudioTree';
  import ResourceDrawer from '../../components/ResourceDrawer';
  import Diff from './Diff';
  import DiffTable from './DiffTable';
  import { fileSizeMixin } from 'shared/mixins';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import BottomBar from 'shared/views/BottomBar';
  import Breadcrumbs from 'shared/views/Breadcrumbs';
  import IconButton from 'shared/views/IconButton';
  import LoadingText from 'shared/views/LoadingText';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';

  export default {
    name: 'StagingTreeView',
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
    },
    mixins: [fileSizeMixin],
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
        isLoading: false,
        displayDiffDialog: false,
        displayDeployDialog: false,
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
      ...mapGetters('contentNode', [
        'getTreeNodeChildren',
        'getContentNodeChildren',
        'getContentNodeAncestors',
      ]),
      isEmpty() {
        return !this.hasStagingTree || !this.getTreeNodeChildren(this.stagingId);
      },
      children() {
        return this.getContentNodeChildren(this.nodeId);
      },
      ancestors() {
        return this.getContentNodeAncestors(this.nodeId, true);
      },
      breadcrumbsItems() {
        return this.ancestors.map(ancestor => {
          return {
            id: ancestor.id,
            title: ancestor.title,
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
        return this.stagingDiff.count_topics ? this.stagingDiff.count_topics.staged : 0;
      },
      topicsCountLive() {
        return this.stagingDiff.count_topics ? this.stagingDiff.count_topics.live : 0;
      },
      resourcesCountStaged() {
        return this.stagingDiff.count_resources ? this.stagingDiff.count_resources.staged : 0;
      },
      resourcesCountLive() {
        return this.stagingDiff.count_resources ? this.stagingDiff.count_resources.live : 0;
      },
      resourcesCountDiff() {
        return this.resourcesCountStaged - this.resourcesCountLive;
      },
      fileSizeStaged() {
        return this.stagingDiff.file_size_in_bytes ? this.stagingDiff.file_size_in_bytes.staged : 0;
      },
      fileSizeLive() {
        return this.stagingDiff.file_size_in_bytes ? this.stagingDiff.file_size_in_bytes.live : 0;
      },
      fileSizeDiff() {
        return this.fileSizeStaged - this.fileSizeLive;
      },
    },
    watch: {
      nodeId(newNodeId) {
        this.loadAncestors({ id: newNodeId, includeSelf: true });
        this.loadChildren({ parent: newNodeId, tree_id: this.stagingId });
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
    },
    created() {
      if (!this.hasStagingTree) {
        return;
      }

      this.isLoading = true;
      Promise.all([
        this.loadAncestors({ id: this.nodeId, includeSelf: true }),
        this.loadChildren({ parent: this.nodeId, tree_id: this.stagingId }),
      ]).then(() => (this.isLoading = false));

      this.loadCurrentChannelStagingDiff();
    },
    methods: {
      ...mapActions(['showSnackbar']),
      ...mapActions('channel', ['loadChannel']),
      ...mapActions('currentChannel', ['loadCurrentChannelStagingDiff', 'deployCurrentChannel']),
      ...mapActions(['addViewModeOverride', 'removeViewModeOverride']),
      ...mapActions('contentNode', ['loadAncestors', 'loadChildren']),
      ...mapMutations('contentNode', {
        collapseAll: 'COLLAPSE_ALL_EXPANDED',
        setExpanded: 'SET_EXPANSION',
      }),
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
      async onDeployChannelClick() {
        await this.deployCurrentChannel();
        await this.loadChannel(this.currentChannel.id);

        this.$router.push({
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.rootId,
          },
        });

        this.showSnackbar({
          text: this.$tr('channelDeployed'),
        });
      },
    },
    $trs: {
      emptyChannelText: 'No resources found',
      emptyChannelSubText: 'Resources are available for you to review vie Ricecooker',
      collapseAllButton: 'Collapse all',
      openCurrentLocationButton: 'Open to current location',
      totalResources: 'Total resources',
      totalSize: 'Total size',
      openDiffDialogBtn: 'View summary',
      closeDiffDialogBtn: 'Close',
      diffDialogTitle: 'Summary details',
      deployChannel: 'Deploy channel',
      deployDialogDescription:
        'You are about to replace the all live resources with staged resources.',
      liveResources: 'Live resources',
      stagedResources: 'Staged resources',
      topicsCount: `{count, number} {count, plural, one { topic } other { topics }}`,
      resourcesCount: `{count, number} {count, plural, one { resource } other { resources }}`,
      cancelDeployBtn: 'Cancel',
      confirmDeployBtn: 'Deploy channel',
      channelDeployed: 'Channel has been deployed',
    },
  };

</script>

<style lang="less" scoped>

  .bottom-bar-btns {
    flex-grow: 0;
  }

</style>
