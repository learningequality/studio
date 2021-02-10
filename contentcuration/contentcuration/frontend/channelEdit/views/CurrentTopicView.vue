<template>

  <VContainer v-resize="handleWindowResize" fluid class="ma-0 main pa-0 panel">
    <!-- Breadcrumbs -->
    <VToolbar dense color="transparent" flat>
      <slot name="action"></slot>
      <Breadcrumbs :items="ancestors" class="mx-1 px-2 py-0">
        <template #item="{ item, isLast }">
          <!-- Current item -->
          <VLayout v-if="isLast" align-center row>
            <VFlex class="font-weight-bold text-truncate" shrink :class="getTitleClass(item)">
              {{ getTitle(item) }}
            </VFlex>
            <Menu v-if="item.displayNodeOptions">
              <template #activator="{ on }">
                <IconButton
                  icon="dropdown"
                  :text="$tr('optionsButton')"
                  v-on="on"
                />
              </template>
              <ContentNodeOptions v-if="node" :nodeId="topicId" />
            </Menu>
          </VLayout>
          <span v-else class="grey--text" :class="getTitleClass(item)">
            {{ getTitle(item) }}
          </span>
        </template>
      </Breadcrumbs>
    </VToolbar>

    <!-- Topic actions -->
    <ToolBar dense :flat="!elevated" style="z-index: 4;">
      <div class="mx-3">
        <Checkbox
          v-if="node && node.total_count"
          v-model="selectAll"
          :indeterminate="selected.length > 0 && !selectAll"
          :label="selected.length ? '' : $tr('selectAllLabel')"
        />
      </div>
      <VSlideXTransition>
        <div v-if="selected.length">
          <IconButton
            v-if="canEdit"
            icon="edit"
            :text="$tr('editSelectedButton')"
            data-test="edit-selected-btn"
            @click="editNodes(selected)"
          />
          <IconButton
            icon="clipboard"
            :text="$tr('copySelectedButton')"
            data-test="copy-selected-to-clipboard-btn"
            @click="copyToClipboard(selected)"
          />
          <IconButton
            v-if="canEdit"
            icon="move"
            :text="$tr('moveSelectedButton')"
            data-test="move-selected-btn"
            @click="openMoveModal"
          />
          <IconButton
            v-if="canEdit"
            icon="copy"
            :text="$tr('duplicateSelectedButton')"
            data-test="duplicate-selected-btn"
            @click="duplicateNodes(selected)"
          />
          <IconButton
            v-if="canEdit"
            icon="remove"
            :text="$tr('deleteSelectedButton')"
            data-test="delete-selected-btn"
            @click="removeNodes(selected)"
          />
        </div>
      </VSlideXTransition>

      <MoveModal
        ref="moveModal"
        v-model="moveModalOpen"
        :moveNodeIds="selected"
        @target="moveNodes"
      />

      <VSpacer />

      <VFadeTransition>
        <div v-show="selected.length" v-if="$vuetify.breakpoint.mdAndUp" class="px-1">
          {{ selectionText }}
        </div>
      </VFadeTransition>

      <VToolbarItems>
        <Menu class="pa-1">
          <template #activator="{ on }">
            <IconButton
              icon="list"
              :text="$tr('viewModeTooltip')"
              v-on="on"
            />
          </template>
          <VList>
            <VListTile
              v-for="mode in viewModes"
              :key="mode"
              @click="setViewMode(mode), trackViewMode(mode)"
            >
              <VListTileAction style="min-width: 32px;">
                <Icon v-if="mode === viewMode">
                  check
                </Icon>
              </VListTileAction>
              <VListTileTitle>{{ $tr(mode) }}</VListTileTitle>
            </VListTile>
          </VList>
        </Menu>

        <Menu v-if="canEdit">
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
            <VListTile
              :to="uploadFilesLink"
              @click="trackClickEvent('Upload files')"
            >
              <VListTileTitle>{{ $tr('uploadFiles') }}</VListTileTitle>
            </VListTile>
            <VListTile @click="newExerciseNode">
              <VListTileTitle>{{ $tr('addExercise') }}</VListTileTitle>
            </VListTile>
            <VListTile
              :to="importFromChannelsRoute"
              @click="trackClickEvent('Import from other channels')"
            >
              <VListTileTitle>{{ $tr('importFromChannels') }}</VListTileTitle>
            </VListTile>
          </VList>
        </Menu>
      </VToolbarItems>
    </ToolBar>

    <!-- Topic items and resource panel -->
    <VLayout
      ref="resources"
      class="pa-0 resources"
      row
      :style="{ height }"
    >
      <VFadeTransition mode="out-in">
        <DraggableRegion
          :draggableUniverse="draggableUniverse"
          :draggableId="draggableId"
          :draggableMetadata="node"
          :dropEffect="draggableDropEffect"
          @draggableDrop="handleDragDrop"
        >
          <NodePanel
            ref="nodepanel"
            :key="topicId"
            class="node-panel panel"
            :parentId="topicId"
            :selected="selected"
            @select="selected = [...selected, $event]"
            @deselect="selected = selected.filter(id => id !== $event)"
            @scroll="scroll"
          />
        </DraggableRegion>
      </VFadeTransition>
      <ResourceDrawer
        v-if="currentChannel"
        ref="resourcepanel"
        :nodeId="detailNodeId"
        :channelId="currentChannel.id"
        class="grow"
        @close="closePanel"
        @resize="handleResourceDrawerResize"
        @scroll="scroll"
      >
        <template v-if="canEdit" #actions>
          <IconButton
            size="small"
            icon="edit"
            :text="$tr('editButton')"
            @click="editNodes([detailNodeId])"
          />
          <Menu>
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
          </Menu>
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

  import { mapActions, mapGetters, mapState } from 'vuex';
  import { RouterNames, viewModes, DraggableRegions, DraggableUniverses } from '../constants';
  import ResourceDrawer from '../components/ResourceDrawer';
  import ContentNodeOptions from '../components/ContentNodeOptions';
  import MoveModal from '../components/move/MoveModal';
  import NodePanel from './NodePanel';
  import IconButton from 'shared/views/IconButton';
  import ToolBar from 'shared/views/ToolBar';
  import Breadcrumbs from 'shared/views/Breadcrumbs';
  import Checkbox from 'shared/views/form/Checkbox';
  import { withChangeTracker } from 'shared/data/changes';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import { titleMixin, routerMixin } from 'shared/mixins';
  import { COPYING_FLAG, RELATIVE_TREE_POSITIONS } from 'shared/data/constants';
  import { DraggableTypes, DropEffect } from 'shared/mixins/draggable/constants';
  import { DraggableFlags } from 'shared/vuex/draggablePlugin/module/constants';
  import DraggableRegion from 'shared/views/draggable/DraggableRegion';

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
      MoveModal,
      DraggableRegion,
    },
    mixins: [titleMixin, routerMixin],
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
        moveModalOpen: false,
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
      ...mapGetters('draggable', ['activeDraggableRegionId']),
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
          // Cannot "select all" of nothing
          if (this.children.length) {
            return this.selected.length === this.children.length;
          }
          return false;
        },
        set(value) {
          if (value) {
            this.selected = this.children.filter(node => !node[COPYING_FLAG]).map(node => node.id);
            this.trackClickEvent('Select all');
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
      draggableId() {
        return DraggableRegions.TOPIC_VIEW;
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
    },
    watch: {
      topicId: {
        handler() {
          // Clear selections when topic changes
          this.selected = [];
          this.loadingAncestors = true;
          this.elevated = false; // list starts at top, so don't elevate toolbar
          // NOTE: this may be redundant with the same call in TreeView.created
          // for initial page load
          this.loadAncestors({ id: this.topicId }).then(() => {
            this.updateTitleForPage();
            this.loadingAncestors = false;
          });
        },
        immediate: true,
      },
      detailNodeId: {
        handler(nodeId) {
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
          this.updateTitleForPage();
        },
        immediate: true,
      },
    },
    methods: {
      ...mapActions(['showSnackbar', 'clearSnackbar']),
      ...mapActions(['setViewMode', 'addViewModeOverride', 'removeViewModeOverride']),
      ...mapActions('contentNode', [
        'createContentNode',
        'loadAncestors',
        'moveContentNodes',
        'copyContentNode',
        'copyContentNodes',
      ]),
      ...mapActions('clipboard', ['copyAll']),
      clearSelections() {
        this.selected = [];
      },
      updateTitleForPage() {
        let detailTitle;
        const topicTitle = this.getTitle(this.getContentNode(this.topicId));
        if (this.detailNodeId) {
          detailTitle = this.getTitle(this.getContentNode(this.detailNodeId));
        }
        const title = detailTitle ? `${detailTitle} - ${topicTitle}` : topicTitle;
        this.updateTabTitle(this.$store.getters.appendChannelName(title));
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
        this.trackClickEvent('Add topics');
      },
      newExerciseNode() {
        let nodeData = {
          kind: ContentKindsNames.EXERCISE,
          title: '',
        };
        this.newContentNode(RouterNames.ADD_EXERCISE, nodeData);
        this.trackClickEvent('Add exercise');
      },
      editNodes(ids) {
        this.trackClickEvent('Edit');
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
      /**
       * TODO: This shouldn't really be public. This is being called from TreeView
       * to avoid duplication, and to avoid duplicating strings for now
       * @public
       */
      handleDropToClipboard(drop) {
        const sourceIds = drop.sources.map(source => source.metadata.id).filter(Boolean);
        if (sourceIds.length) {
          this.copyToClipboard(sourceIds);
        }
      },
      /**
       * TODO: This shouldn't really be public. This is being called from TreeView
       * to avoid duplication, and to avoid duplicating strings for now
       * @public
       */
      handleDragDrop(drop) {
        const { data } = drop;
        const { identity, section, relative } = data.target;
        const isTargetTree =
          drop.target && drop.target.region && drop.target.region.id === DraggableRegions.TREE;

        let position = RELATIVE_TREE_POSITIONS.LAST_CHILD;

        // Specifically when the target is a collection in the tree, or if it's an item and not in
        // the tree, we'll position as relative to the target
        if (
          (isTargetTree && identity.type === DraggableTypes.COLLECTION) ||
          (!isTargetTree && identity.type === DraggableTypes.ITEM)
        ) {
          // Relative would be filled for DragEffect.SORT containers, so we'll use it if
          // it's present otherwise fallback to hovered section
          position = this.relativePosition(relative > DraggableFlags.NONE ? relative : section);
        } else {
          // Safety check
          const { kind } = identity.metadata || {};
          if (kind && kind !== ContentKindsNames.TOPIC) {
            return Promise.reject('Cannot set child of non-topic');
          }

          // Otherwise we'll determine an insert position based off the hovered section. The tree
          // allows dropping on a topic to insert there, but the topic view does not
          position = this.insertPosition(section);
        }

        const payload = {
          id__in: data.sources.map(s => s.metadata.id),
          target: identity.metadata.id,
          position,
        };

        // All sources should be from the same region
        const sourceRegion = drop.sources[0].region;
        return sourceRegion && sourceRegion.id === DraggableRegions.CLIPBOARD
          ? this.copyContentNodes(payload)
          : this.moveContentNodes(payload);
      },
      insertPosition(mask) {
        return mask & DraggableFlags.TOP
          ? RELATIVE_TREE_POSITIONS.FIRST_CHILD
          : RELATIVE_TREE_POSITIONS.LAST_CHILD;
      },
      relativePosition(mask) {
        return mask & DraggableFlags.TOP
          ? RELATIVE_TREE_POSITIONS.LEFT
          : RELATIVE_TREE_POSITIONS.RIGHT;
      },
      moveNodes(target) {
        return this.moveContentNodes({ id__in: this.selected, parent: target }).then(() => {
          this.clearSelections();
          this.$refs.moveModal.moveComplete();
        });
      },
      removeNodes: withChangeTracker(function(id__in, changeTracker) {
        this.trackClickEvent('Delete');
        let nextRoute;
        // If the NodePanel for one of the deleted nodes is open, close it
        if (id__in.includes(this.$route.params.detailNodeId)) {
          nextRoute = { params: { detailNodeId: null } };
        }
        return this.moveContentNodes({ id__in, parent: this.trashId }).then(() => {
          this.clearSelections();
          if (nextRoute) {
            this.$router.replace(nextRoute);
          }
          return this.showSnackbar({
            text: this.$tr('removedItems', { count: id__in.length }),
            actionText: this.$tr('undo'),
            actionCallback: () => changeTracker.revert(),
          });
        });
      }),
      copyToClipboard: withChangeTracker(function(ids, changeTracker) {
        this.trackClickEvent('Copy to clipboard');
        const nodes = this.getContentNodes(ids);
        this.showSnackbar({
          duration: null,
          text: this.$tr('creatingClipboardCopies'),
          //! COMMENTED OUT UNTIL FUNCTIONALITY UPDATED
          // actionText: this.$tr('cancel'),
          actionCallback: () => changeTracker.revert(),
        });

        return this.copyAll({ nodes }).then(() => {
          this.clearSelections();
          return this.showSnackbar({
            text: this.$tr('copiedItemsToClipboard'),
            //! COMMENTED OUT UNTIL FUNCTIONALITY UPDATED
            // actionText: this.$tr('undo'),
            actionCallback: () => changeTracker.revert(),
          });
        });
      }),
      duplicateNodes: withChangeTracker(function(id__in, changeTracker) {
        this.trackClickEvent('Copy');
        this.showSnackbar({
          duration: null,
          text: this.$tr('creatingCopies'),
          actionText: this.$tr('cancel'),
          actionCallback: () => changeTracker.revert(),
        });
        return Promise.all(
          id__in.map(id =>
            this.copyContentNode({
              id,
              target: id,
              position: RELATIVE_TREE_POSITIONS.RIGHT,
            })
          )
        ).then(() => {
          this.clearSelections();
          return this.clearSnackbar();
          // TODO: Shows too quickly, need to show when copy task completes
          // return this.showSnackbar({
          //   text: this.$tr('copiedItems'),
          //   actionText: this.$tr('undo'),
          //   actionCallback: () => changeTracker.revert(),
          // });
        });
      }),
      scroll(e) {
        this.elevated = e.target.scrollTop > 0;
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
      openMoveModal() {
        this.trackClickEvent('Move');
        this.moveModalOpen = true;
      },
      trackClickEvent(eventLabel) {
        this.$analytics.trackClick('channel_editor_toolbar', eventLabel);
      },
      trackViewMode(mode) {
        this.$analytics.trackAction('general', mode);
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
      // copiedItems: 'Copy operation complete',
      copiedItemsToClipboard: 'Copied to clipboard',
      removedItems: 'Sent to trash',
      selectAllLabel: 'Select all',
      viewModeTooltip: 'View',
    },
  };

</script>

<style scoped>
  .main {
    background-color: white;
  }
  .panel {
    height: inherit;
    overflow-y: auto;
  }

  .fade-transition-enter-active,
  .fade-transition-leave-active {
    transition-duration: 0.1s
  }
</style>
