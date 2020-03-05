<template>

  <VContainer fluid class="panel pa-0 ma-0" style="height: calc(100vh - 64px);">
    <!-- Breadcrumbs -->
    <VToolbar v-if="ancestors.length" dense color="transparent" flat>
      <VBreadcrumbs :items="ancestors" class="pa-0">
        <template #divider>
          <Icon>chevron_right</Icon>
        </template>
        <template #item="props">
          <span class="px-2 notranslate subheading">
            {{ props.item.title }}
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
          <VListTile :to="treeLink(topicId)">
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
            <VListTile v-for="mode in viewModes" :key="mode" @click="viewMode = mode">
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
        <NodePanel :parentId="topicId" />
      </VFlex>
      <v-expand-x-transition>
        <ResizableNavigationDrawer
          v-show="showResourceDrawer"
          right
          localName="resource-panel"
          :minWidth="400"
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
      </v-expand-x-transition>
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
        viewMode: viewModes.DEFAULT,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit']),
      ...mapGetters('contentNode', ['getContentNode']),
      node() {
        return this.getContentNode(this.topicId);
      },
      ancestors() {
        // TODO: update with actual ancestors
        return [{ title: 'channel' }, { title: 'topic 1' }];
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
    },
    beforeMount() {
      this.showResourceDrawer = Boolean(this.detailNodeId);
    },
    methods: {
      ...mapActions('contentNode', ['createContentNode']),
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
      treeLink(nodeId) {
        return {
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.parentId,
            detailNodeId: nodeId,
          },
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
</style>
