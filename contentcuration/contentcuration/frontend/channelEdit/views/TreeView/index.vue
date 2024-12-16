<template>

  <TreeViewBase :loading="loading" @dropToClipboard="handleDropToClipboard">
    <template v-if="hasStagingTree && canManage" #extension>
      <Banner
        :value="true"
        border
        style="width: 100%;"
        data-test="staging-tree-banner"
      >
        <VLayout align-center justify-start>
          <VIconWrapper>build</VIconWrapper>
          <span class="pl-1">
            <KRouterLink
              :to="stagingTreeLink"
              :style="{ 'text-decoration': 'underline' }"
              data-test="staging-tree-link"
            >{{ $tr('updatedResourcesReadyForReview') }}</KRouterLink>
            (<time :datetime="channelModifiedDate">{{ prettyChannelModifiedDate }}</time>)
          </span>
        </VLayout>
      </Banner>
    </template>
    <DraggableRegion
      :draggableUniverse="draggableUniverse"
      :draggableId="draggableId"
      :draggableMetadata="rootContentNode"
      :dropEffect="draggableDropEffect"
      @draggableDrop="handleDragDrop"
    >
      <ResizableNavigationDrawer
        v-show="hasTopics"
        ref="hierarchy"
        v-model="drawer.open"
        :permanent="!hideHierarchyDrawer"
        :temporary="hideHierarchyDrawer"
        clipped
        localName="topic-tree"
        class="tree-drawer"
        :maxWidth="drawer.maxWidth"
        :minWidth="200"
        :style="{
          backgroundColor: $vuetify.theme.backgroundColor,
          zIndex: hideHierarchyDrawer ? 8 : 4,
        }"
        :app="hasTopics"
        :hide-overlay="drawer.hideOverlay"
        @scroll="onHierarchyScroll"
      >
        <DraggableCollection
          :draggableId="draggablePrependId"
          :dropEffect="draggableDropEffect"
          @draggableDrop="handleRegionDrop"
        >
          <template #default="{ isDropAllowed }">
            <VToolbar
              :color="isDropAllowed
                ? $vuetify.theme.draggableDropZone
                : $vuetify.theme.backgroundColor"
              class="hierarchy-toolbar py-1 tree-prepend"
              absolute
              dense
              clipped-left
              :flat="!listElevated"
              style="width: calc(100% - 1px);"
            >
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
              <div v-if="hideHierarchyDrawer">
                <IconButton
                  icon="clear"
                  :text="$tr('closeDrawer')"
                  @click="drawer.open = false"
                />
              </div>
            </VToolbar>
          </template>
        </DraggableCollection>
        <div class="mt-5 pl-3">
          <LoadingText v-if="loading" />
          <StudioTree
            v-else-if="rootId"
            :treeId="rootId"
            :nodeId="rootId"
            :selectedNodeId="nodeId"
            :dropEffect="draggableDropEffect"
            :onNodeClick="onTreeNodeClick"
            :allowEditing="true"
            :root="true"
            :dataPreloaded="true"
          />
        </div>
        <DraggableCollection
          :draggableId="draggableAppendId"
          :dropEffect="draggableDropEffect"
          @draggableDrop="handleRegionDrop"
        >
          <VSpacer class="tree-append" />
        </DraggableCollection>
      </ResizableNavigationDrawer>
    </DraggableRegion>
    <VContent class="main-content">
      <!-- Render this so we can detect if we need to hide the hierarchy panel on page load -->
      <PageNotFoundError v-if="nodeNotFound" :backHomeLink="pageNotFoundBackHomeLink" />
      <CurrentTopicView
        v-else
        ref="topicview"
        :topicId="nodeId"
        :detailNodeId="detailNodeId"
        @onPanelResize="handlePanelResize"
      >
        <template #action>
          <div v-if="hasTopics && !drawer.permanent" class="hierarchy-toggle">
            <IconButton
              icon="sidebar"
              :text="$tr('showSidebar')"
              @click="drawer.open = true"
            />
          </div>
        </template>
      </CurrentTopicView>
    </VContent>
  </TreeViewBase>

</template>


<script>

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import CurrentTopicView from '../CurrentTopicView';
  import StudioTree from '../../components/StudioTree/StudioTree';
  import { RouteNames, DraggableRegions, DraggableUniverses } from '../../constants';
  import TreeViewBase from './TreeViewBase';
  import Banner from 'shared/views/Banner';
  import IconButton from 'shared/views/IconButton';
  import PageNotFoundError from 'shared/views/errors/PageNotFoundError';
  import LoadingText from 'shared/views/LoadingText';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';
  import DraggableRegion from 'shared/views/draggable/DraggableRegion';
  import DraggableCollection from 'shared/views/draggable/DraggableCollection';
  import { DraggableIdentityHelper } from 'shared/vuex/draggablePlugin/module/utils';
  import { DraggableFlags } from 'shared/vuex/draggablePlugin/module/constants';
  import { DropEffect } from 'shared/mixins/draggable/constants';

  const DEFAULT_HIERARCHY_MAXWIDTH = 500;
  const NODEPANEL_MINWIDTH = 350;

  export default {
    name: 'TreeView',
    components: {
      DraggableCollection,
      DraggableRegion,
      TreeViewBase,
      StudioTree,
      Banner,
      IconButton,
      PageNotFoundError,
      ResizableNavigationDrawer,
      CurrentTopicView,
      LoadingText,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      detailNodeId: {
        type: String,
        required: false,
        default: null,
      },
    },
    data() {
      return {
        nodeNotFound: false,
        drawer: {
          maxWidth: DEFAULT_HIERARCHY_MAXWIDTH,
          permanent: false,
          open: false,
          hideOverlay: false,
        },
        loading: true,
        listElevated: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', [
        'currentChannel',
        'hasStagingTree',
        'stagingId',
        'rootId',
        'canEdit',
        'canManage',
      ]),
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeAncestors']),
      ...mapGetters('draggable', ['activeDraggableRegionId']),
      rootContentNode() {
        return this.getContentNode(this.rootId);
      },
      hasTopics() {
        // Hierarchy should only appear if topics are present
        // in the channel, so this will prevent the panel from
        // showing up if the channel only contains resources
        const node = this.rootContentNode;
        return node && Boolean(node.total_count - node.resource_count);
      },
      hideHierarchyDrawer() {
        return !this.drawer.permanent || this.$vuetify.breakpoint.xsOnly;
      },
      ancestors() {
        return this.getContentNodeAncestors(this.nodeId);
      },
      stagingTreeLink() {
        return {
          name: RouteNames.STAGING_TREE_VIEW,
          params: {
            nodeId: this.stagingId,
          },
        };
      },
      channelModifiedDate() {
        if (!this.currentChannel || !this.currentChannel.modified) {
          return null;
        }
        return this.currentChannel.modified;
      },
      prettyChannelModifiedDate() {
        if (!this.channelModifiedDate) {
          return '';
        }

        return this.$formatDate(this.channelModifiedDate, {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
        });
      },
      pageNotFoundBackHomeLink() {
        return {
          to: {
            name: RouteNames.TREE_ROOT_VIEW,
          },
        };
      },
      draggableId() {
        return DraggableRegions.TREE;
      },
      draggableUniverse() {
        return DraggableUniverses.CONTENT_NODES;
      },
      draggableDropEffect() {
        if (!this.canEdit) {
          return DropEffect.NONE;
        }
        return this.activeDraggableRegionId === DraggableRegions.CLIPBOARD
          ? DropEffect.COPY
          : DropEffect.MOVE;
      },
      draggablePrependId() {
        return `${this.draggableId}_prepend`;
      },
      draggableAppendId() {
        return `${this.draggableId}_append`;
      },
    },
    watch: {
      // Makes a HEAD request to see if the content node exists every time the route changes
      nodeId: {
        handler: 'verifyContentNodeId',
        immediate: true,
      },
    },
    created() {
      const childrenPromise = this.loadChildren({ parent: this.rootId });
      Promise.all([childrenPromise, this.loadAncestors({ id: this.nodeId })]).then(
        ([childrenResponse]) => {
          this.loading = false;
          this.more = childrenResponse.more || null;
          this.jumpToLocation();
        }
      );
    },
    methods: {
      ...mapMutations('contentNode', {
        collapseAll: 'COLLAPSE_ALL_EXPANDED',
        setExpanded: 'SET_EXPANSION',
      }),
      ...mapActions('contentNode', ['loadAncestors', 'loadChildren']),
      verifyContentNodeId(id) {
        this.nodeNotFound = false;
        return this.$store.dispatch('contentNode/headContentNode', id).catch(() => {
          this.nodeNotFound = true;
        });
      },
      jumpToLocation() {
        this.ancestors.forEach(ancestor => {
          this.setExpanded({ id: ancestor.id, expanded: true });
        });
      },
      onTreeNodeClick(nodeId) {
        if (this.$route.params.nodeId === nodeId) {
          return;
        }
        this.$router.push({
          name: RouteNames.TREE_VIEW,
          params: {
            nodeId,
          },
        });
      },
      handlePanelResize(width) {
        const hierarchyPanelWidth = this.$refs.hierarchy.getWidth();
        const targetTopicViewWidth = NODEPANEL_MINWIDTH + width;
        const totalWidth = targetTopicViewWidth + hierarchyPanelWidth;

        if (totalWidth > window.innerWidth) {
          // If the combined width of the resource panel, NODEPANEL_MINWIDTH,
          // and hierarchy drawer is wider than the screen, collapse the hierarchy drawer
          if (this.drawer.permanent) {
            this.drawer.open = false;
            this.drawer.hideOverlay = true;
            this.drawer.permanent = false;

            // If the drawer was permanent, drawer.open is automatically set to true,
            // so hide the overlay while the drawer is closing
            this.$nextTick(() => {
              this.drawer.hideOverlay = false;
            }, 200);
          }
          this.drawer.maxWidth = DEFAULT_HIERARCHY_MAXWIDTH;
        } else {
          // Otherwise, make sure hierarchy drawer can't expand past NODEPANEL_MINWIDTH
          const allowedWidth = window.innerWidth - targetTopicViewWidth;
          this.drawer.permanent = true;
          this.drawer.maxWidth = Math.min(DEFAULT_HIERARCHY_MAXWIDTH, allowedWidth);
        }
      },
      onHierarchyScroll(e) {
        this.listElevated = e.target.scrollTop > 0;
      },
      /**
       * Uses the prepend and append collections to map the drop event data to the region
       * instead, using top or bottom depending on it if was on the prepend or append collection
       * @param drop
       */
      handleRegionDrop(drop) {
        const { identity } = drop.data;
        if (![this.draggablePrependId, this.draggableAppendId].find(id => id === identity.id)) {
          return this.handleDragDrop(drop);
        }

        const { region } = new DraggableIdentityHelper(identity);
        const target = {
          identity: region,
          section:
            identity.id === this.draggablePrependId ? DraggableFlags.TOP : DraggableFlags.BOTTOM,
          relative: DraggableFlags.NONE,
        };

        this.handleDragDrop({
          ...drop,
          ...target,
          target,
        });
      },
      handleDropToClipboard(data) {
        // TODO: Not ideal, but avoids headaches with strings/translations
        if (this.$refs.topicview) {
          this.$refs.topicview.handleDropToClipboard(data);
        }
      },
      handleDragDrop(data) {
        // TODO: Not ideal, but avoids headaches with strings/translations
        if (this.$refs.topicview) {
          this.$refs.topicview.handleDragDrop(data);
        }
      },
    },
    $trs: {
      showSidebar: 'Show sidebar',
      collapseAllButton: 'Collapse all',
      openCurrentLocationButton: 'Expand to current folder location',
      updatedResourcesReadyForReview: 'Updated resources are ready for review',
      closeDrawer: 'Close',
    },
  };

</script>


<style lang="less" scoped>

  /deep/ .v-toolbar__extension {
    padding: 0;
  }

  .tree-drawer /deep/ .drawer-contents {
    display: flex;
    flex-direction: column;
  }

  .hierarchy-toggle /deep/ .v-icon {
    transform: scaleX(-1);

    [dir='rtl'] & {
      transform: none;
    }
  }

  .main-content {
    transition: padding-left 0s !important;
  }

  .hierarchy-toolbar /deep/ .v-toolbar__content {
    padding: 0 20px;
  }

  .tree-prepend,
  .tree-append {
    transition: background-color ease 0.2s;
  }

  .tree-append {
    min-height: 48px;

    &.dragging-over.in-draggable-universe.drop-allowed {
      /* stylelint-disable-next-line custom-property-pattern */
      background-color: var(--v-draggableDropZone-base);
    }
  }

</style>
