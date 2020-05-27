<template>

  <VContainer fluid class="pa-0">
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
                @infoClick="goToNodeDetail(child.id)"
                @topicChevronClick="goToTopic(child.id)"
                @dblclick.native="onNodeDoubleClick(child)"
              />
            </template>
          </VList>
        </VLayout>
      </VContainer>
    </VLayout>
  </VContainer>

</template>


<script>

  import { mapGetters, mapMutations, mapActions } from 'vuex';

  import { RouterNames } from '../constants';

  import ContentNodeListItem from '../components/ContentNodeListItem';
  import StudioTree from '../components/StudioTree/StudioTree';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import Breadcrumbs from 'shared/views/Breadcrumbs';
  import IconButton from 'shared/views/IconButton';
  import LoadingText from 'shared/views/LoadingText';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';

  export default {
    name: 'StagingTreeView',
    components: {
      Breadcrumbs,
      ContentNodeListItem,
      IconButton,
      LoadingText,
      ResizableNavigationDrawer,
      StudioTree,
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
        isLoading: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['stagingId', 'hasStagingTree']),
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
    },
    watch: {
      nodeId(newNodeId) {
        this.loadAncestors({ id: newNodeId, includeSelf: true });
        this.loadChildren({ parent: newNodeId, tree_id: this.stagingId });
      },
    },
    created() {
      this.isLoading = true;
      Promise.all([
        this.loadAncestors({ id: this.nodeId, includeSelf: true }),
        this.loadChildren({ parent: this.nodeId, tree_id: this.stagingId }),
      ]).then(() => (this.isLoading = false));
    },
    methods: {
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
        this.$router.push({
          name: RouterNames.STAGING_TREE_VIEW,
          params: {
            nodeId: this.nodeId,
            detailNodeId: nodeId,
          },
        });
      },
      goToTopic(topicId) {
        this.$router.push({
          name: RouterNames.STAGING_TREE_VIEW,
          params: {
            nodeId: topicId,
          },
        });
      },
      onNodeDoubleClick(node) {
        if (node.kind === ContentKindsNames.TOPIC) {
          this.goToTopic(node.id);
        } else {
          this.goToNodeDetail(node.id);
        }
      },
    },
    $trs: {
      emptyChannelText: 'No resources found',
      emptyChannelSubText: 'Resources are available for you to review vie Ricecooker',
      collapseAllButton: 'Collapse all',
      openCurrentLocationButton: 'Open to current location',
    },
  };

</script>
