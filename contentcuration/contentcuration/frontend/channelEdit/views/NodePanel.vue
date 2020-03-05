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
          <VListTile :to="editNodeLink(node.id)">
            <VListTileTitle>{{ $tr('editTopicDetails') }}</VListTileTitle>
          </VListTile>
          <VListTile :to="treeLink(node, true)">
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
        <template v-for="child in children">
          <VLayout :key="child.id" row wrap>
            <VFlex xs9>
              <router-link :to="treeLink(child)">
                <ContentNodeIcon :kind="child.kind" />
                <span>{{ child.title }}</span>
              </router-link>
            </VFlex>
            <VFlex xs1>
              <VBtn icon :to="editNodeLink(child.id)">
                <VIcon>edit</VIcon>
              </VBtn>
            </VFlex>
            <VFlex xs1>
              <VBtn icon @click="deleteContentNode(child.id)">
                <VIcon>clear</VIcon>
              </VBtn>
            </VFlex>
          </VLayout>
        </template>
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
  import { RouterNames } from '../constants';
  import ResourcePanel from './ResourcePanel';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import IconButton from 'shared/views/IconButton';
  import ToolBar from 'shared/views/ToolBar';

  const VIEW_MODES = {
    DEFAULT: 'DEFAULT_VIEW',
    COMPACT: 'COMPACT_VIEW',
  };

  export default {
    name: 'NodePanel',
    components: {
      ContentNodeIcon,
      IconButton,
      ToolBar,
      ResourcePanel,
      ResizableNavigationDrawer,
    },
    props: {
      parentId: {
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
        viewMode: VIEW_MODES.DEFAULT,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit']),
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeChildren']),
      node() {
        return this.getContentNode(this.parentId);
      },
      children() {
        return this.getContentNodeChildren(this.parentId);
      },
      ancestors() {
        return [{ title: 'channel' }, { title: 'topic 1' }];
      },
      parentTitle() {
        return this.getContentNode(this.parentId).title;
      },
      uploadFilesLink() {
        return { name: RouterNames.UPLOAD_FILES };
      },
      viewModes() {
        return Object.values(VIEW_MODES);
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
      ...mapActions('contentNode', ['createContentNode', 'deleteContentNode']),
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
          title: this.$tr('topicDefaultTitle', { parentTitle: this.parentTitle }),
        };
        this.newContentNode(RouterNames.ADD_TOPICS, nodeData);
      },
      newExerciseNode() {
        let nodeData = {
          kind: 'exercise',
          title: this.$tr('exerciseDefaultTitle', { parentTitle: this.parentTitle }),
        };
        this.newContentNode(RouterNames.ADD_EXERCISE, nodeData);
      },
      editNodeLink(id) {
        return {
          name: RouterNames.VIEW_CONTENTNODES,
          params: {
            detailNodeIds: id,
          },
        };
      },
      treeLink(node, forceDetails) {
        if (node.kind === 'topic' && !forceDetails) {
          return {
            name: RouterNames.TREE_VIEW,
            params: {
              nodeId: node.id,
            },
          };
        }
        return {
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.parentId,
            detailNodeId: node.id,
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
      [VIEW_MODES.DEFAULT]: 'Default',
      [VIEW_MODES.COMPACT]: 'Compact',
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
