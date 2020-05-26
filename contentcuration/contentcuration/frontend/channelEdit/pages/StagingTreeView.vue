<template>

  <VContainer fluid class="pa-0">
    <VLayout
      v-if="!isEmpty"
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
            :onNodeClick="onTreeNodeClick"
            :root="true"
          />
        </div>
      </ResizableNavigationDrawer>

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
    </VLayout>
  </VContainer>

</template>


<script>

  import { mapGetters, mapMutations, mapActions } from 'vuex';

  import { RouterNames } from '../constants';

  import StudioTree from '../components/StudioTree/StudioTree';
  import Breadcrumbs from 'shared/views/Breadcrumbs';
  import IconButton from 'shared/views/IconButton';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';

  export default {
    name: 'StagingTreeView',
    components: {
      Breadcrumbs,
      IconButton,
      ResizableNavigationDrawer,
      StudioTree,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('currentChannel', ['stagingId', 'hasStagingTree']),
      ...mapGetters('contentNode', ['getTreeNodeChildren', 'getContentNodeAncestors']),
      isEmpty() {
        return this.hasStagingTree && this.getTreeNodeChildren(this.nodeId).length > 0;
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
      },
    },
    created() {
      this.loadAncestors({ id: this.nodeId, includeSelf: true });
    },
    methods: {
      ...mapActions('contentNode', ['loadAncestors']),
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
          name: RouterNames.STAGING_TREE_VIEW,
          params: {
            nodeId,
          },
        });
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
