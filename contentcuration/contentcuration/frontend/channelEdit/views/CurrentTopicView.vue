<template>

  <VContainer v-if="node" fluid class="panel pa-0 ma-0">
    <!-- Breadcrumbs -->
    <VToolbar v-if="ancestors.length && !loadingAncestors" dense color="transparent" flat>
      <Breadcrumbs :items="ancestors" class="pa-0">
        <template #item="props">
          <!-- Current item -->
          <VLayout v-if="props.isLast" align-center row>
            <VFlex class="font-weight-bold text-truncate notranslate" shrink>
              {{ props.item.title }}
            </VFlex>
            <VMenu offset-y right>
              <template #activator="{ on }">
                <VBtn icon flat small v-on="on">
                  <Icon>arrow_drop_down</Icon>
                </VBtn>
              </template>
              <ContentNodeOptions :nodeId="topicId" />
            </VMenu>
          </VLayout>
          <span v-else class="notranslate grey--text">
            {{ props.item.title }}
          </span>
        </template>
      </Breadcrumbs>
    </VToolbar>

    <!-- Topic actions -->
    <ToolBar flat dense color="transparent">
      <div class="mr-1">
        <VCheckbox v-if="node.total_count" v-model="selectAll" color="primary" hide-details />
      </div>
      <VSlideXTransition>
        <div v-if="selected.length">
          <IconButton
            v-if="canEdit"
            icon="edit"
            :text="$tr('editSelectedButton')"
            @click="editNodes(selected)"
          />
          <IconButton icon="content_paste" :text="$tr('copySelectedButton')" />
          <IconButton
            v-if="canEdit"
            icon="sync_alt"
            :text="$tr('moveSelectedButton')"
            @click="setMoveNodes(selected)"
          />
          <IconButton
            v-if="canEdit"
            icon="delete"
            :text="$tr('deleteSelectedButton')"
            @click="removeNodes(selected)"
          />
        </div>
      </VSlideXTransition>
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
            <VListTile :to="importFromChannelsRoute">
              <VListTileTitle>{{ $tr('importFromChannels') }}</VListTileTitle>
            </VListTile>
          </VList>
        </VMenu>
      </VToolbarItems>
    </ToolBar>

    <!-- Topic items and resource panel -->
    <VLayout row :style="{height: contentHeight}">
      <VFadeTransition mode="out-in">
        <NodePanel :key="topicId" :parentId="topicId" />
      </VFadeTransition>
      <ResourceDrawer
        :nodeId="detailNodeId"
        :channelId="currentChannel.id"
        class="grow"
        @close="closePanel"
      >
        <template v-if="canEdit" #actions>
          <IconButton
            small
            icon="edit"
            :text="$tr('editButton')"
            @click="editNodes([detailNodeId])"
          />
          <VMenu offset-y left>
            <template #activator="{ on }">
              <VBtn small icon flat v-on="on">
                <Icon>more_horiz</Icon>
              </VBtn>
            </template>
            <ContentNodeOptions
              :nodeId="detailNodeId"
              hideDetailsLink
              @removed="closePanel"
            />
          </VMenu>
        </template>
        <template v-else #actions>
          <IconButton
            small
            icon="content_copy"
            :text="$tr('copyToClipboardButton')"
          />
        </template>
      </ResourceDrawer>
    </VLayout>
  </VContainer>

</template>

<script>

  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import { RouterNames, viewModes } from '../constants';
  import ResourceDrawer from '../components/ResourceDrawer';
  import NodePanel from './NodePanel';
  import ContentNodeOptions from './ContentNodeOptions';
  import IconButton from 'shared/views/IconButton';
  import ToolBar from 'shared/views/ToolBar';
  import Breadcrumbs from 'shared/views/Breadcrumbs';

  export default {
    name: 'CurrentTopicView',
    components: {
      IconButton,
      ToolBar,
      NodePanel,
      ResourceDrawer,
      ContentNodeOptions,
      Breadcrumbs,
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
        loadingAncestors: false,
        selected: [],
      };
    },
    computed: {
      ...mapState(['viewMode']),
      ...mapGetters('currentChannel', ['canEdit', 'currentChannel', 'trashId']),
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeAncestors']),
      selectAll: {
        get() {
          return this.selected.length;
        },
        set(value) {
          if (value) {
            this.selected = [this.topicId];
          } else {
            this.selected = [];
          }
        },
      },
      node() {
        return this.getContentNode(this.topicId);
      },
      ancestors() {
        return this.getContentNodeAncestors(this.topicId).map(ancestor => {
          return {
            id: ancestor.id,
            to: this.treeLink({ nodeId: ancestor.id }),
            title: ancestor.title,
          };
        });
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
      importFromChannelsRoute() {
        return {
          name: RouterNames.IMPORT_FROM_CHANNELS_BROWSE,
          params: {
            destNodeId: this.$route.params.nodeId,
          },
        };
      },
    },
    watch: {
      topicId() {
        this.selected = [];
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
      detailNodeId(nodeId) {
        if (nodeId) {
          this.addViewModeOverride({
            id: 'resourceDrawer',
            viewMode: viewModes.COMPACT,
          });
        } else {
          this.removeViewModeOverride({
            id: 'resourceDrawer',
          });
        }
      },
    },
    methods: {
      ...mapActions(['setViewMode', 'addViewModeOverride', 'removeViewModeOverride']),
      ...mapActions('contentNode', ['createContentNode', 'loadAncestors', 'moveContentNodes']),
      ...mapMutations('contentNode', { setMoveNodes: 'SET_MOVE_NODES' }),
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
      editNodes(ids) {
        this.$router.push({
          name: RouterNames.CONTENTNODE_DETAILS,
          params: {
            detailNodeIds: ids.join(','),
          },
        });
      },
      treeLink(params) {
        return {
          name: RouterNames.TREE_VIEW,
          params,
        };
      },
      closePanel() {
        this.$router.push({
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.$route.params.nodeId,
            detailNodeId: null,
          },
        });
      },
      removeNodes(ids) {
        this.moveContentNodes({ ids, parent: this.trashId }).then(() => {
          this.$store.dispatch('showSnackbar', {
            text: this.$tr('removedItemsMessage', { count: ids.length }),
          });
        });
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
      copyToClipboardButton: 'Copy to clipboard',
      [viewModes.DEFAULT]: 'Default',
      [viewModes.COMPACT]: 'Compact',
      editSelectedButton: 'Edit selected items',
      copySelectedButton: 'Copy selected items to clipboard',
      moveSelectedButton: 'Move selected items',
      deleteSelectedButton: 'Delete selected items',
      removedItemsMessage: 'Sent {count, plural,\n =1 {# item}\n other {# items}} to the trash',
    },
  };

</script>

<style scoped>
  .panel {
    align-self: flex-start;
    height: 100%;
    background-color: white;
  }

  .fade-transition-enter-active,
  .fade-transition-leave-active {
    transition-duration: 0.1s
  }
</style>
