<template>

  <VContainer fluid class="panel pa-0 ma-0" style="height: calc(100vh - 64px);">
    <!-- Breadcrumbs -->
    <VToolbar v-if="ancestors.length && !loadingAncestors" dense color="transparent" flat>
      <VBreadcrumbs :items="ancestors" class="pa-0">
        <template #divider>
          <Icon>chevron_right</Icon>
        </template>
        <template #item="props">
          <router-link
            tag="span"
            class="mx-2 notranslate subheading"
            style="cursor: pointer;"
            :to="treeLink({nodeId: props.item.id})"
          >
            {{ props.item.title }}
          </router-link>
          <span>

          </span>
        </template>
      </VBreadcrumbs>
      <VMenu offset-y left>
        <template #activator="{ on }">
          <VBtn icon flat v-on="on">
            <Icon>arrow_drop_down</Icon>
          </VBtn>
        </template>
        <VList>
          <VListTile @click="newTopicNode">
            <VListTileTitle>{{ $tr('newSubtopic') }}</VListTileTitle>
          </VListTile>
          <VListTile :to="editNodeLink(topicId)">
            <VListTileTitle>{{ $tr('editTopicDetails') }}</VListTileTitle>
          </VListTile>
          <VListTile :to="treeLink({nodeId: topicId, detailNodeId: topicId})">
            <VListTileTitle>{{ $tr('viewDetails') }}</VListTileTitle>
          </VListTile>
          <VListTile @click.stop>
            <VListTileTitle>{{ $tr('move') }}</VListTileTitle>
          </VListTile>
          <VListTile @click.stop>
            <VListTileTitle>{{ $tr('makeACopy') }}</VListTileTitle>
          </VListTile>
          <VListTile @click.stop>
            <VListTileTitle>{{ $tr('copyToClipboard') }}</VListTileTitle>
          </VListTile>
          <VListTile @click.stop>
            <VListTileTitle>{{ $tr('remove') }}</VListTileTitle>
          </VListTile>
        </VList>
      </VMenu>
    </VToolbar>

    <!-- Topic actions -->
    <ToolBar flat dense color="transparent">
      <VCheckbox color="primary" hide-details />
      <VSpacer />
      <VToolbarItems>
        <VMenu offset-y left>
          <template #activator="{ on }">
            <VBtn icon flat v-on="on">
              <Icon>list</Icon>
            </VBtn>
          </template>
          <VList>
            <VListTile v-for="mode in viewModes" :key="mode" @click="setViewMode(mode)">
              <VListTileAction style="min-width: 32px;">
                <Icon v-if="mode === viewMode">
                  check
                </Icon>
              </VListTileAction>
              <VListTileTitle>{{ $tr(mode) }}</VListTileTitle>
            </VListTile>
          </VList>
        </VMenu>

        <VMenu v-if="canEdit" offset-y>
          <template #activator="{ on }">
            <VBtn color="primary" class="ml-2" style="height: 32px;" v-on="on">
              {{ $tr('addButton') }}
              <Icon small>
                arrow_drop_down
              </Icon>
            </VBtn>
          </template>
          <VList>
            <VListTile @click="newTopicNode">
              <VListTileTitle>{{ $tr('addTopic') }}</VListTileTitle>
            </VListTile>
            <VListTile :to="uploadFilesLink">
              <VListTileTitle>{{ $tr('uploadFiles') }}</VListTileTitle>
            </VListTile>
            <VListTile @click="newExerciseNode">
              <VListTileTitle>{{ $tr('addExercise') }}</VListTileTitle>
            </VListTile>
            <VListTile @click.stop>
              <VListTileTitle>{{ $tr('importFromChannels') }}</VListTileTitle>
            </VListTile>
          </VList>
        </VMenu>
      </VToolbarItems>
    </ToolBar>

    <!-- Topic items and resource panel -->
    <VLayout row :style="{height: contentHeight}">

      <VFlex class="pa-4" style="overflow-y: auto;">
        <VFadeTransition mode="out-in">
          <NodePanel :key="topicId" :parentId="topicId" />
        </VFadeTransition>
      </VFlex>
      <VExpandXTransition>
        <ResizableNavigationDrawer
          v-show="showResourceDrawer"
          right
          localName="resource-panel"
          :minWidth="400"
          :maxWidth="700"
          permanent
        >
          <div v-if="detailNodeId" class="pa-4">
            <ResourcePanel :nodeId="detailNodeId" @close="closePanel">
              <template #actions>
                <IconButton
                  small
                  icon="edit"
                  :text="$tr('editButton')"
                  :to="editNodeLink(detailNodeId)"
                />
              </template>
            </ResourcePanel>
          </div>
        </ResizableNavigationDrawer>
      </VExpandXTransition>
    </VLayout>
  </VContainer>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import { RouterNames, viewModes } from '../constants';
  import ResourcePanel from './ResourcePanel';
  import NodePanel from './NodePanel';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';
  import IconButton from 'shared/views/IconButton';
  import ToolBar from 'shared/views/ToolBar';

  export default {
    name: 'CurrentTopicView',
    components: {
      IconButton,
      ToolBar,
      NodePanel,
      ResourcePanel,
      ResizableNavigationDrawer,
    },
    props: {
      topicId: {
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
        showResourceDrawer: false,
        viewMode: sessionStorage['topic-tree-view'] || viewModes.DEFAULT,
        loadingAncestors: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit', 'currentChannel']),
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeAncestors']),
      node() {
        return this.getContentNode(this.topicId);
      },
      ancestors() {
        return this.getContentNodeAncestors(this.topicId);
      },
      uploadFilesLink() {
        return { name: RouterNames.UPLOAD_FILES };
      },
      viewModes() {
        return Object.values(viewModes);
      },
      contentHeight() {
        // We can't take advantage of using the app property because
        // this gets overwritten by the edit modal components, throwing off the
        // styling whenever the modal is opened
        return this.ancestors.length ? 'calc(100vh - 160px)' : 'calc(100vh - 112px)';
      },
    },
    watch: {
      detailNodeId(value) {
        this.showResourceDrawer = Boolean(value);
      },
      ancestors(value) {
        // Full ancestor path hasn't been loaded
        if (!value.some(a => a.id === this.topicId)) {
          this.loadingAncestors = true;
          this.loadAncestors({ id: this.topicId, channel_id: this.currentChannel.id }).then(() => {
            this.loadingAncestors = false;
          });
        }
      },
    },
    beforeMount() {
      this.showResourceDrawer = Boolean(this.detailNodeId);
    },
    methods: {
      ...mapActions('contentNode', ['createContentNode', 'loadAncestors']),
      newContentNode(route, { kind, title }) {
        this.createContentNode({ parent: this.parentId, kind, title }).then(newId => {
          this.$router.push({
            name: route,
            params: { detailNodeIds: newId },
          });
        });
      },
      newTopicNode() {
        let nodeData = {
          kind: 'topic',
          title: this.$tr('topicDefaultTitle', { parentTitle: this.node.title }),
        };
        this.newContentNode(RouterNames.ADD_TOPICS, nodeData);
      },
      newExerciseNode() {
        let nodeData = {
          kind: 'exercise',
          title: this.$tr('exerciseDefaultTitle', { parentTitle: this.node.title }),
        };
        this.newContentNode(RouterNames.ADD_EXERCISE, nodeData);
      },
      editNodeLink(id) {
        return {
          name: RouterNames.CONTENTNODE_DETAILS,
          params: {
            detailNodeIds: id,
          },
        };
      },
      treeLink(params) {
        return {
          name: RouterNames.TREE_VIEW,
          params,
        };
      },
      closePanel() {
        this.showResourceDrawer = false;
        // Setting this so the contenst of drawer don't disappear
        // while the drawer is closing
        setTimeout(() => {
          this.$router.push({
            name: RouterNames.TREE_VIEW,
            params: {
              nodeId: this.$route.params.nodeId,
              detailNodeId: null,
            },
          });
        }, 700);
      },
      setViewMode(viewMode) {
        this.viewMode = sessionStorage['topic-tree-view'] = viewMode;
      },
    },

    $trs: {
      addTopic: 'New subtopic',
      addExercise: 'New exercise',
      uploadFiles: 'Upload files',
      importFromChannels: 'Import from channels',
      topicDefaultTitle: '{parentTitle} topic',
      exerciseDefaultTitle: '{parentTitle} exercise',
      addButton: 'Add',
      editButton: 'Edit',
      [viewModes.DEFAULT]: 'Default',
      [viewModes.COMPACT]: 'Compact',
      newSubtopic: 'New subtopic',
      editTopicDetails: 'Edit topic details',
      viewDetails: 'View details',
      move: 'Move',
      makeACopy: 'Make a copy',
      copyToClipboard: 'Copy to clipboard',
      remove: 'Remove',
    },
  };

</script>

<style scoped>
  .panel {
    align-self: flex-start;
    height: 100%;
    background-color: white;
  }
  .resource-drawer {
    border-left: 1px solid var(--v-grey-lighten4);
    overflow-y: auto;
  }

  .fade-transition-enter-active,
  .fade-transition-leave-active {
    transition-duration: 0.1s
  }
</style>
