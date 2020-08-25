<template>

  <TreeViewBase>
    <VContainer fluid class="pa-0">
      <Banner
        v-model="hasStagingTree"
        border
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
      <VLayout row>
        <ResizableNavigationDrawer
          v-show="!isEmptyChannel"
          ref="hierarchy"
          permanent
          clipped
          localName="topic-tree"
          class="hidden-xs-only"
          :maxWidth="500"
          :minWidth="200"
          style="height: unset"
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
        <VContent class="pa-0 ma-0" style="height: calc(100vh - 64px);">
          <CurrentTopicView :topicId="nodeId" :detailNodeId="detailNodeId" />
        </VContent>
      </VLayout>
    </VContainer>
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
    computed: {
      ...mapGetters('currentChannel', ['currentChannel', 'hasStagingTree', 'stagingId', 'rootId']),
      ...mapGetters('contentNode', ['getContentNodeChildren', 'getContentNodeAncestors']),
      isEmptyChannel() {
        return (
          !this.getContentNodeChildren(this.rootId) ||
          !this.getContentNodeChildren(this.rootId).length
        );
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
