<template>

  <TreeViewBase>
    <template v-if="hasStagingTree" #extension>
      <Banner
        v-model="hasStagingTree"
        border
        style="width: 100%;"
        data-test="staging-tree-banner"
      >
        <VLayout align-center justify-start>
          <Icon>build</Icon>
          <span class="pl-1">
            <!--
              v-if="hasStagingTree" to prevent the link from being rendered
              when banner is hidden because there is no staging tree
            -->
            <router-link
              v-if="hasStagingTree"
              :to="stagingTreeLink"
              :style="{'text-decoration': 'underline'}"
              data-test="staging-tree-link"
            >{{ $tr('updatedResourcesReadyForReview') }}</router-link>
            (<time :datetime="channelModifiedDate">{{ prettyChannelModifiedDate }}</time>)
          </span>
        </VLayout>
      </Banner>
    </template>

    <ResizableNavigationDrawer
      v-show="hasTopics"
      ref="hierarchy"
      v-model="drawer.open"
      :permanent="drawer.permanent"
      :temporary="!drawer.permanent"
      clipped
      localName="topic-tree"
      class="hidden-xs-only"
      :maxWidth="drawer.maxWidth"
      :minWidth="200"
      :style="{backgroundColor: $vuetify.theme.backgroundColor}"
      :app="hasTopics"
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
          :disabled="!ancestors || !ancestors.length"
          icon="gps_fixed"
          :text="$tr('openCurrentLocationButton')"
          @click="jumpToLocation"
        />
      </VLayout>
      <div style="margin-left: -24px;">
        <StudioTree
          :treeId="rootId"
          :nodeId="rootId"
          :selectedNodeId="nodeId"
          :onNodeClick="onTreeNodeClick"
          :allowEditing="true"
          :root="true"
        />
      </div>
    </ResizableNavigationDrawer>
    <VContent>
      <CurrentTopicView
        ref="topicview"
        :topicId="nodeId"
        :detailNodeId="detailNodeId"
        @onPanelResize="handlePanelResize"
      />
    </VContent>
  </TreeViewBase>

</template>


<script>

  import { mapGetters, mapMutations } from 'vuex';
  import { RouterNames } from '../../constants';
  import StudioTree from '../../components/StudioTree/StudioTree';
  import CurrentTopicView from '../CurrentTopicView';
  import TreeViewBase from './TreeViewBase';
  import Banner from 'shared/views/Banner';
  import IconButton from 'shared/views/IconButton';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';

  const DEFAULT_HIERARCHY_MAXWIDTH = 500;
  const NODEPANEL_MINWIDTH = 350;

  export default {
    name: 'TreeView',
    components: {
      TreeViewBase,
      StudioTree,
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
        drawer: {
          maxWidth: DEFAULT_HIERARCHY_MAXWIDTH,
          permanent: false,
          open: false,
        },
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['currentChannel', 'hasStagingTree', 'stagingId', 'rootId']),
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeAncestors']),
      hasTopics() {
        const node = this.getContentNode(this.rootId);
        return node && Boolean(node.total_count - node.resource_count);
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
      handlePanelResize(width) {
        const hierarchyPanelWidth = this.$refs.hierarchy.getWidth();
        const targetTopicViewWidth = NODEPANEL_MINWIDTH + width;
        const totalWidth = targetTopicViewWidth + hierarchyPanelWidth;

        if (totalWidth > window.innerWidth) {
          // If the combined width of the resource panel, NODEPANEL_MINWIDTH,
          // and hierarchy drawer is wider than the screen, collapse the hierarchy drawer
          this.drawer.permanent = false;
          this.drawer.open = false;
          this.drawer.maxWidth = DEFAULT_HIERARCHY_MAXWIDTH;
        } else {
          // Otherwise, make sure hierarchy drawer can't expand past NODEPANEL_MINWIDTH
          const allowedWidth = window.innerWidth - targetTopicViewWidth;
          this.drawer.permanent = true;
          this.drawer.maxWidth = Math.min(DEFAULT_HIERARCHY_MAXWIDTH, allowedWidth);
        }
      },
    },
    $trs: {
      collapseAllButton: 'Collapse all',
      openCurrentLocationButton: 'Jump to current topic location',
      updatedResourcesReadyForReview: 'Updated resources are ready for review',
    },
  };

</script>


<style lang="less" scoped>

  /deep/ .v-toolbar__extension {
    padding: 0;
  }

</style>
