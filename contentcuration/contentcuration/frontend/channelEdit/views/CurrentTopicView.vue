<template>

  <VContainer v-resize="handleWindowResize" fluid class="panel pa-0 ma-0">
    <!-- Breadcrumbs -->
    <VToolbar dense color="transparent" flat>
      <slot name="action"></slot>
      <Breadcrumbs :items="ancestors" class="py-0 px-2 mx-1">
        <template #item="{item, isLast}">
          <!-- Current item -->
          <VLayout v-if="isLast" align-center row>
            <VFlex class="font-weight-bold text-truncate" shrink :class="getTitleClass(item)">
              {{ getTitle(item) }}
            </VFlex>
            <VMenu v-if="item.displayNodeOptions" offset-y right>
              <template #activator="{ on }">
                <IconButton
                  icon="dropdown"
                  :text="$tr('optionsButton')"
                  v-on="on"
                />
              </template>
              <ContentNodeOptions v-if="node" :nodeId="topicId" />
            </VMenu>
          </VLayout>
          <span v-else class="grey--text" :class="getTitleClass(item)">
            {{ getTitle(item) }}
          </span>
        </template>
      </Breadcrumbs>
    </VToolbar>

    <!-- Topic actions -->
    <ToolBar dense :flat="!elevated">
      <div class="mx-3">
        <Checkbox
          v-if="node && node.total_count"
          v-model="selectAll"
          :indeterminate="selected.length > 0 && !selectAll"
          :label="selected.length? '' : $tr('selectAllLabel')"
        />
      </div>
      <VSlideXTransition>
        <div v-if="selected.length">
          <IconButton
            v-if="canEdit"
            icon="edit"
            :text="$tr('editSelectedButton')"
            @click="editNodes(selected)"
          />
          <IconButton
            icon="clipboard"
            :text="$tr('copySelectedButton')"
            @click="copyToClipboard(selected)"
          />
          <IconButton
            v-if="canEdit"
            icon="move"
            :text="$tr('moveSelectedButton')"
            @click="setMoveNodes(selected)"
          />
          <IconButton
            v-if="canEdit"
            icon="copy"
            :text="$tr('duplicateSelectedButton')"
            @click="duplicateNodes(selected)"
          />
          <IconButton
            v-if="canEdit"
            icon="remove"
            :text="$tr('deleteSelectedButton')"
            @click="removeNodes(selected)"
          />
        </div>
      </VSlideXTransition>
      <VSpacer />
      <VFadeTransition>
        <div v-show="selected.length" v-if="$vuetify.breakpoint.mdAndUp" class="px-1">
          {{ selectionText }}
        </div>
      </VFadeTransition>

      <VToolbarItems>
        <VMenu offset-y left class="pa-1">
          <template #activator="{ on }">
            <IconButton
              icon="list"
              :text="$tr('viewModeTooltip')"
              v-on="on"
            />
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
    <VLayout
      ref="resources"
      class="resources pa-0"
      row
      :style="{height}"
      @scroll="scroll"
    >
      <VFadeTransition mode="out-in">
        <NodePanel
          ref="nodepanel"
          :key="topicId"
          class="node-panel panel"
          :parentId="topicId"
          :selected="selected"
          @select="selected = [...selected, $event]"
          @deselect="selected = selected.filter(id => id !== $event)"
        />
      </VFadeTransition>
      <ResourceDrawer
        ref="resourcepanel"
        :nodeId="detailNodeId"
        :channelId="currentChannel.id"
        class="grow"
        @close="closePanel"
        @resize="handleResourceDrawerResize"
      >
        <template v-if="canEdit" #actions>
          <IconButton
            size="small"
            icon="edit"
            :text="$tr('editButton')"
            @click="editNodes([detailNodeId])"
          />
          <VMenu offset-y left>
            <template #activator="{ on }">
              <IconButton
                size="small"
                icon="optionsVertical"
                :text="$tr('optionsButton')"
                v-on="on"
              />
            </template>
            <ContentNodeOptions
              :nodeId="detailNodeId"
              hideDetailsLink
              hideEditLink
              @removed="closePanel"
            />
          </VMenu>
        </template>
        <template v-else #actions>
          <IconButton
            size="small"
            icon="clipboard"
            :text="$tr('copyToClipboardButton')"
            @click="copyToClipboard([detailNodeId])"
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
  import ContentNodeOptions from '../components/ContentNodeOptions';
  import NodePanel from './NodePanel';
  import IconButton from 'shared/views/IconButton';
  import ToolBar from 'shared/views/ToolBar';
  import Breadcrumbs from 'shared/views/Breadcrumbs';
  import Checkbox from 'shared/views/form/Checkbox';
  import { withChangeTracker } from 'shared/data/changes';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import { titleMixin } from 'shared/mixins';

  export default {
    name: 'CurrentTopicView',
    components: {
      IconButton,
      ToolBar,
      NodePanel,
      ResourceDrawer,
      ContentNodeOptions,
      Breadcrumbs,
      Checkbox,
    },
    mixins: [titleMixin],
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
        elevated: false,
      };
    },
    computed: {
      ...mapState({
        selectedNodeIds: state => state.currentChannel.selectedNodeIds,
      }),
      ...mapState(['viewMode']),
      ...mapGetters('currentChannel', [
        'canEdit',
        'currentChannel',
        'trashId',
        'hasStagingTree',
        'rootId',
      ]),
      ...mapGetters('contentNode', [
        'getContentNode',
        'getContentNodes',
        'getContentNodeAncestors',
        'getTopicAndResourceCounts',
        'getContentNodeChildren',
      ]),
      selected: {
        get() {
          return this.selectedNodeIds;
        },
        set(value) {
          this.$store.commit('currentChannel/SET_SELECTED_NODE_IDS', value);
        },
      },
      selectAll: {
        get() {
          return this.selected.length === this.children.length;
        },
        set(value) {
          if (value) {
            this.selected = this.children.map(node => node.id);
          } else {
            this.selected = [];
          }
        },
      },
      height() {
        return this.hasStagingTree ? 'calc(100vh - 224px)' : 'calc(100vh - 160px)';
      },
      node() {
        return this.getContentNode(this.topicId);
      },
      ancestors() {
        return this.getContentNodeAncestors(this.topicId, true).map(ancestor => {
          return {
            id: ancestor.id,
            to: this.treeLink({ nodeId: ancestor.id }),
            title: ancestor.title,
            displayNodeOptions: this.rootId !== ancestor.id,
          };
        });
      },
      children() {
        return this.getContentNodeChildren(this.topicId);
      },
      uploadFilesLink() {
        return { name: RouterNames.UPLOAD_FILES };
      },
      viewModes() {
        return Object.values(viewModes);
      },
      importFromChannelsRoute() {
        return {
          name: RouterNames.IMPORT_FROM_CHANNELS_BROWSE,
          params: {
            destNodeId: this.$route.params.nodeId,
          },
        };
      },
      selectionText() {
        return this.$tr('selectionCount', this.getTopicAndResourceCounts(this.selected));
      },
    },
    watch: {
      topicId() {
        this.loadingAncestors = true;
        this.loadAncestors({ id: this.topicId }).then(() => {
          this.loadingAncestors = false;
        });
      },
      detailNodeId(nodeId) {
        if (nodeId) {
          this.addViewModeOverride({
            id: 'resourceDrawer',
            viewMode: viewModes.COMPACT,
          });
          this.$nextTick(() => {
            this.handleResourceDrawerResize();
          });
        } else {
          this.removeViewModeOverride({
            id: 'resourceDrawer',
          });
          this.handleResourceDrawerResize(0);
        }
      },
    },
    methods: {
      ...mapActions(['showSnackbar']),
      ...mapActions(['setViewMode', 'addViewModeOverride', 'removeViewModeOverride']),
      ...mapActions('contentNode', [
        'createContentNode',
        'loadAncestors',
        'moveContentNodes',
        'copyContentNodes',
      ]),
      ...mapActions('clipboard', ['copyAll']),
      ...mapMutations('contentNode', { setMoveNodes: 'SET_MOVE_NODES' }),
      clearSelections() {
        this.selected = [];
      },
      newContentNode(route, { kind, title }) {
        this.createContentNode({ parent: this.topicId, kind, title }).then(newId => {
          this.$router.push({
            name: route,
            params: { detailNodeIds: newId },
          });
        });
      },
      newTopicNode() {
        let nodeData = {
          kind: ContentKindsNames.TOPIC,
          title: '',
        };
        this.newContentNode(RouterNames.ADD_TOPICS, nodeData);
      },
      newExerciseNode() {
        let nodeData = {
          kind: ContentKindsNames.EXERCISE,
          title: '',
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
      removeNodes: withChangeTracker(function(id__in, changeTracker) {
        return this.moveContentNodes({ id__in, parent: this.trashId }).then(() => {
          this.clearSelections();
          return this.showSnackbar({
            text: this.$tr('removedItems', { count: id__in.length }),
            actionText: this.$tr('undo'),
            actionCallback: () => changeTracker.revert(),
          });
        });
      }),
      copyToClipboard: withChangeTracker(function(ids, changeTracker) {
        const nodes = this.getContentNodes(ids);
        this.showSnackbar({
          duration: null,
          text: this.$tr('creatingClipboardCopies'),
          actionText: this.$tr('cancel'),
          actionCallback: () => changeTracker.revert(),
        });

        return this.copyAll({ nodes }).then(() => {
          this.clearSelections();
          return this.showSnackbar({
            text: this.$tr('copiedItemsToClipboard'),
            actionText: this.$tr('undo'),
            actionCallback: () => changeTracker.revert(),
          });
        });
      }),
      duplicateNodes: withChangeTracker(function(id__in, changeTracker) {
        this.showSnackbar({
          duration: null,
          text: this.$tr('creatingCopies'),
          actionText: this.$tr('cancel'),
          actionCallback: () => changeTracker.revert(),
        });

        return this.copyContentNodes({ id__in, target: this.topicId, deep: true }).then(() => {
          this.clearSelections();
          return this.showSnackbar({
            text: this.$tr('copiedItems'),
            actionText: this.$tr('undo'),
            actionCallback: () => changeTracker.revert(),
          });
        });
      }),
      scroll() {
        this.elevated = this.$refs.resources.scrollTop > 0;
      },
      handleWindowResize() {
        this.handleResourceDrawerResize();
      },
      handleResourceDrawerResize(width) {
        if (!isNaN(width)) {
          this.$emit('onPanelResize', width);
        } else if (this.detailNodeId && this.$refs.resourcepanel) {
          this.$emit('onPanelResize', this.$refs.resourcepanel.getWidth());
        } else {
          this.$emit('onPanelResize', 0);
        }
      },
    },
    $trs: {
      addTopic: 'New topic',
      addExercise: 'New exercise',
      uploadFiles: 'Upload files',
      importFromChannels: 'Import from channels',
      addButton: 'Add',
      editButton: 'Edit',
      optionsButton: 'Options',
      copyToClipboardButton: 'Copy to clipboard',
      [viewModes.DEFAULT]: 'Default view',
      [viewModes.COMFORTABLE]: 'Comfortable view',
      [viewModes.COMPACT]: 'Compact view',
      editSelectedButton: 'Edit',
      copySelectedButton: 'Copy to clipboard',
      moveSelectedButton: 'Move',
      duplicateSelectedButton: 'Make a copy',
      deleteSelectedButton: 'Delete',
      selectionCount:
        '{topicCount, plural,\n =1 {# topic}\n other {# topics}}, {resourceCount, plural,\n =1 {# resource}\n other {# resources}}',
      undo: 'Undo',
      cancel: 'Cancel',
      creatingCopies: 'Copying...',
      creatingClipboardCopies: 'Copying to clipboard...',
      copiedItems: 'Copy operation complete',
      copiedItemsToClipboard: 'Copied to clipboard',
      removedItems: 'Sent to trash',
      selectAllLabel: 'Select all',
      viewModeTooltip: 'View',
    },
  };

</script>

<style scoped>
  .panel {
    background-color: white;
    height: inherit;
    overflow-y: auto;
  }

  .fade-transition-enter-active,
  .fade-transition-leave-active {
    transition-duration: 0.1s
  }
</style>
