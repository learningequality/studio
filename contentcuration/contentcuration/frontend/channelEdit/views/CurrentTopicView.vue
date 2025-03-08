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
            <Menu v-if="item.displayNodeOptions" v-model="breadcrumbsMenu">
              <template #activator="{ on }">
                <IconButton
                  icon="dropdown"
                  :text="$tr('optionsButton')"
                  v-on="on"
                />
              </template>
              <ContentNodeOptions v-if="node && breadcrumbsMenu" :nodeId="topicId" />
            </Menu>
          </VLayout>
          <span v-else class="grey--text" :class="getTitleClass(item)">
            {{ getTitle(item) }}
          </span>
        </template>
      </Breadcrumbs>
      <Menu
        v-if="!loadingAncestors"
        class="pa-1"
      >
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
              <Icon v-if="mode === viewMode" icon="check" />
            </VListTileAction>
            <VListTileTitle>{{ $tr(mode) }}</VListTileTitle>
          </VListTile>
        </VList>
      </Menu>
    </VToolbar>

    <!-- Topic actions -->
    <ToolBar dense :flat="!elevated" style="z-index: 4;">
      <div class="mx-3">
        <Checkbox
          v-if="node && node.total_count"
          v-model="selectAll"
          :indeterminate="selected.length > 0 && !selectAll"
          :label="selected.length ? selectionText : $tr('selectAllLabel')"
          style="font-size: 16px;"
        />
      </div>
      <div v-if="selected.length" class="command-palette-wrapper">
        <KListWithOverflow
          :items="commandPaletteOptions"
          :appearanceOverrides="{ justifyContent: 'flex-end' }"
        >
          <template #item="{ item }">
            <KIconButton
              :icon="item.icon"
              :tooltip="item.label"
              :disabled="item.disabled"
              :data-test="item.dataTest"
              @click="item.onClick()"
            />
          </template>
          <template #more="{ overflowItems }">
            <KIconButton
              tooltip="More"
              icon="optionsVertical"
              appearance="flat-button"
              :primary="false"
            >
              <template #menu>
                <KDropdownMenu
                  :options="overflowItems"
                  @select="(option) => option.onClick()"
                />
              </template>
            </KIconButton>
          </template>
          <template #divider>
            <div class="divider-wrapper">
              <div :style="dividerStyle"></div>
            </div>
          </template>
        </KListWithOverflow>
      </div>

      <MoveModal
        ref="moveModal"
        v-model="moveModalOpen"
        :moveNodeIds="selected"
        @target="moveNodes"
      />
      <VSpacer v-if="!selected.length" />
      <VToolbarItems v-if="!loadingAncestors">
        <Menu v-if="canEdit">
          <template #activator="{ on }">
            <VBtn color="primary" class="ml-2" style="height: 32px;" v-on="on">
              {{ $tr('addButton') }}
              <Icon icon="dropdown" :color="$themeTokens.textInverted" />
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
            @editTitleDescription="showTitleDescriptionModal"
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
          <Menu v-model="resourceDrawerMenu">
            <template #activator="{ on }">
              <IconButton
                size="small"
                icon="optionsVertical"
                :text="$tr('optionsButton')"
                v-on="on"
              />
            </template>
            <ContentNodeOptions
              v-if="resourceDrawerMenu"
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
    <InheritAncestorMetadataModal
      ref="inheritModal"
      :parent="inheritanceParent"
      @inherit="inheritMetadata"
    />
  </VContainer>

</template>

<script>

  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import get from 'lodash/get';
  import InheritAncestorMetadataModal from '../components/edit/InheritAncestorMetadataModal';
  import MoveModal from '../components/move/MoveModal';
  import ContentNodeOptions from '../components/ContentNodeOptions';
  import ResourceDrawer from '../components/ResourceDrawer';
  import {
    RouteNames,
    viewModes,
    DraggableRegions,
    DraggableUniverses,
    QuickEditModals,
  } from '../constants';
  import NodePanel from './NodePanel';
  import IconButton from 'shared/views/IconButton';
  import ToolBar from 'shared/views/ToolBar';
  import Breadcrumbs from 'shared/views/Breadcrumbs';
  import Checkbox from 'shared/views/form/Checkbox';
  import { withChangeTracker } from 'shared/data/changes';
  import {
    ContentKindsNames,
    ContentKindLearningActivityDefaults,
  } from 'shared/leUtils/ContentKinds';
  import { titleMixin, routerMixin } from 'shared/mixins';
  import { RELATIVE_TREE_POSITIONS } from 'shared/data/constants';
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
      InheritAncestorMetadataModal,
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
        default: null,
      },
    },
    data() {
      return {
        loadingAncestors: false,
        elevated: false,
        moveModalOpen: false,
        breadcrumbsMenu: false,
        resourceDrawerMenu: false,
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
        'getSelectedTopicAndResourceCountText',
        'getContentNodeChildren',
        'isNodeInCopyingState',
      ]),
      ...mapState('contentNode', ['inheritingNodes']),
      ...mapGetters('clipboard', ['getCopyTrees']),
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
        ancestors() {
  if (!this.currentChannel) {
    return [];
  }
  
  return this.getContentNodeAncestors(this.topicId, true).map(ancestor => {
    return {
      id: ancestor.id,
      to: this.treeLink({ nodeId: ancestor.id }),
      title: ancestor.parent ? ancestor.title : this.currentChannel.name,
      displayNodeOptions: this.rootId !== ancestor.id,
    };
  });
},
        set(value) {
          if (value) {
            this.selected = this.children
              .filter(node => !this.isNodeInCopyingState(node.id))
              .map(node => node.id);
            this.trackClickEvent('Select all');
          } else {
            this.selected = [];
          }
        },
      },
      commandPaletteOptions() {
        const groupedOptions = [
          [
            {
              label: this.$tr('editSelectedButton'),
              icon: 'edit',
              onClick: () => this.editNodes(this.selected),
              condition: this.canEdit,
              dataTest: 'edit-selected-btn',
            },
            {
              label: this.$tr('moveSelectedButton'),
              icon: 'move',
              onClick: () => this.openMoveModal(),
              condition: this.canEdit,
              dataTest: 'move-selected-btn',
            },
            {
              label: this.$tr('copySelectedButton'),
              icon: 'clipboard',
              onClick: () => this.copyToClipboard(this.selected),
              condition: true,
              dataTest: 'copy-selected-to-clipboard-btn',
            },
            {
              label: this.$tr('duplicateSelectedButton'),
              icon: 'copy',
              onClick: () => this.duplicateNodes(this.selected),
              condition: this.canEdit,
              dataTest: 'duplicate-selected-btn',
            },
            {
              label: this.$tr('sortAlphabetically'),
              icon: 'sort',
              onClick: () => this.sortNodes(this.selected),
              condition: this.canEdit,
              dataTest: 'sort-selected-btn',
            },
            {
              label: this.$tr('deleteSelectedButton'),
              icon: 'remove',
              onClick: () => this.removeNodes(this.selected),
              condition: this.canEdit,
              dataTest: 'delete-selected-btn',
            },
          ],
          [
            {
              label: this.$tr('editLanguageButton'),
              icon: 'language',
              onClick: this.quickEditModalFactory(QuickEditModals.LANGUAGE),
              condition: this.canEdit,
              dataTest: 'change-langugage-btn',
            },
          ],
          [
            {
              label: this.$tr('editCategoriesButton'),
              icon: 'categories',
              onClick: this.quickEditModalFactory(QuickEditModals.CATEGORIES),
              condition: this.canEdit,
              dataTest: 'change-categories-btn',
            },
            {
              label: this.$tr('editLevelsButton'),
              icon: 'levels',
              onClick: this.quickEditModalFactory(QuickEditModals.LEVELS),
              condition: this.canEdit,
              dataTest: 'change-levels-btn',
            },
            {
              label: this.$tr('editLearningActivitiesButton'),
              icon: 'activities',
              onClick: this.quickEditModalFactory(QuickEditModals.LEARNING_ACTIVITIES),
              condition: this.canEdit && this.isResourceSelected,
              disabled: this.isTopicSelected,
              dataTest: 'change-learning-activities-btn',
            },
          ],
          [
            {
              label: this.$tr('editSourceButton'),
              icon: 'attribution',
              onClick: this.quickEditModalFactory(QuickEditModals.SOURCE),
              condition: this.canEdit && this.isResourceSelected,
              disabled: this.isTopicSelected,
              dataTest: 'change-learning-activities-btn',
            },
            {
              label: this.$tr('editAudienceButton'),
              icon: 'audience',
              onClick: this.quickEditModalFactory(QuickEditModals.AUDIENCE),
              condition: this.canEdit && this.isResourceSelected,
              disabled: this.isTopicSelected,
              dataTest: 'change-audience-btn',
            },
            {
              label: this.$tr('editWhatIsNeededButton'),
              icon: 'lesson',
              onClick: this.quickEditModalFactory(QuickEditModals.WHAT_IS_NEEDED),
              condition: this.canEdit,
              dataTest: 'change-resources-neded-btn',
            },
          ],
        ];

        const filteredOptions = groupedOptions
          .filter(group => group.some(option => option.condition))
          .map(group => group.filter(option => option.condition));

        // Flatten the array with a divider between each group
        return filteredOptions.reduce((acc, group, index) => {
          if (index > 0) {
            acc.push({ type: 'divider' });
          }
          return acc.concat(group);
        }, []);
      },
      height() {
        return this.hasStagingTree ? 'calc(100vh - 224px)' : 'calc(100vh - 160px)';
      },
      node() {
        return this.getContentNode(this.topicId);
      },
      selectedNodes() {
        return this.getContentNodes(this.selected);
      },
      isTopicSelected() {
        return this.selectedNodes.some(node => node.kind === ContentKindsNames.TOPIC);
      },
      isResourceSelected() {
        return this.selectedNodes.some(node => node.kind !== ContentKindsNames.TOPIC);
      },
      ancestors() {
        return this.getContentNodeAncestors(this.topicId, true).map(ancestor => {
          return {
            id: ancestor.id,
            to: this.treeLink({ nodeId: ancestor.id }),
            title: ancestor.parent ? ancestor.title : this.currentChannel.name,
            displayNodeOptions: this.rootId !== ancestor.id,
          };
        });
      },
      children() {
        return this.getContentNodeChildren(this.topicId);
      },
      uploadFilesLink() {
        return { name: RouteNames.UPLOAD_FILES };
      },
      viewModes() {
        return Object.values(viewModes);
      },
      importFromChannelsRoute() {
        return {
          name: RouteNames.IMPORT_FROM_CHANNELS_BROWSE,
          params: {
            destNodeId: this.$route.params.nodeId,
          },
        };
      },
      selectionText() {
        return this.getSelectedTopicAndResourceCountText(this.selected);
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
      dividerStyle() {
        return {
          height: '100%',
          backgroundColor: this.$themeTokens.fineLine,
          width: '1px',
        };
      },
      currentInheritingNodes() {
        if (!this.inheritingNodes) {
          return [];
        }
        // Handle inheritance modals one parent at a time.
        const firstNode = this.inheritingNodes[0];
        return this.inheritingNodes.filter(n => n.parent === firstNode.parent);
      },
      inheritanceParent() {
        const firstNode = this.currentInheritingNodes[0];

        if (!firstNode) {
          return;
        }
        return this.getContentNode(firstNode.parent);
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
          this.removeContentNodes({ parentId: this.topicId }).then(success => {
            if (success) {
              this.loadAncestors({ id: this.topicId }).then(() => {
                this.updateTitleForPage();
                this.loadingAncestors = false;
              });
            }
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
        'waitForCopyingStatus',
        'setQuickEditModal',
        'updateContentNode',
        'removeContentNodes',
      ]),
      ...mapMutations('contentNode', ['CLEAR_INHERITING_NODES']),
      ...mapActions('clipboard', ['copyAll']),
      clearSelections() {
        this.selected = [];
      },

      sortNodes(selected) {
        const selectedNodes = selected.map(id => this.getContentNode(id));
        const orderedNodes = selectedNodes.sort(this.compareNodeTitles);

        const reversedNodes = orderedNodes.reverse();

        const nodeX = this.findNodeBeforeFirstSelected(orderedNodes, selected);

        const targetParent = this.node.id;
        const targetNode = nodeX || targetParent;
        const targetPosition = nodeX
          ? RELATIVE_TREE_POSITIONS.RIGHT
          : RELATIVE_TREE_POSITIONS.FIRST_CHILD;

        const nodeIdsToMove = reversedNodes.map(node => String(node.id));

        this.moveContentNodes({
          id__in: nodeIdsToMove,
          target: targetNode,
          position: targetPosition,
          inherit: false,
        });
      },

      findNodeBeforeFirstSelected(nodes, selected) {
        for (let i = 1; i < nodes.length; i++) {
          if (selected.includes(nodes[i])) {
            return nodes[i - 1];
          }
        }
        return null;
      },

      compareNodeTitles(nodeA, nodeB) {
        const titleA = nodeA.title.toLowerCase();
        const titleB = nodeB.title.toLowerCase();
        return titleA.localeCompare(titleB);
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
      newContentNode(route, payload) {
        this.createContentNode({ parent: this.topicId, ...payload }).then(newId => {
          this.$router.push({
            name: route,
            params: { detailNodeIds: newId },
          });
        });
      },
      newTopicNode() {
        const nodeData = {
          kind: ContentKindsNames.TOPIC,
          title: '',
        };
        this.newContentNode(RouteNames.ADD_TOPICS, nodeData);
        this.trackClickEvent('Add topics');
      },
      newExerciseNode() {
        const nodeData = {
          kind: ContentKindsNames.EXERCISE,
          title: '',
          learning_activities: {
            [ContentKindLearningActivityDefaults[ContentKindsNames.EXERCISE]]: true,
          },
        };
        this.newContentNode(RouteNames.ADD_EXERCISE, nodeData);
        this.trackClickEvent('Add exercise');
      },
      editNodes(ids) {
        this.trackClickEvent('Edit');
        this.$router.push({
          name: RouteNames.CONTENTNODE_DETAILS,
          params: {
            detailNodeIds: ids.join(','),
          },
        });
      },
      quickEditModalFactory(modal) {
        return () => {
          this.setQuickEditModal({
            modal,
            nodeIds: this.selected,
          });
          const trackActionLabel = modal.replace(/_/g, ' ').toLowerCase();
          this.trackClickEvent(`Edit ${trackActionLabel}`);
        };
      },
      treeLink(params) {
        return {
          name: RouteNames.TREE_VIEW,
          params,
        };
      },
      closePanel() {
        this.$router.push({
          name: RouteNames.TREE_VIEW,
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
        const targetMetadata = identity.metadata || {};
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
          const { kind } = targetMetadata;
          if (kind && kind !== ContentKindsNames.TOPIC) {
            return Promise.reject('Cannot set child of non-topic');
          }

          // Otherwise we'll determine an insert position based off the hovered section. The tree
          // allows dropping on a topic to insert there, but the topic view does not
          position = this.insertPosition(section);
        }

        // All sources should be from the same region
        const sources = drop.sources || [];
        const sourceRegion = sources.length > 0 ? sources[0].region : null;
        const payload = {
          target: targetMetadata.id,
          position,
        };

        if (payload.target) {
          // When the source region is the clipboard, we want to make sure we use
          // `excluded_descendants` by accessing the copy trees through the clipboard node ID
          if (sourceRegion && sourceRegion.id === DraggableRegions.CLIPBOARD) {
            return Promise.all(
              sources.map(source => {
                // Using `getCopyTrees` we can access the `excluded_descendants` for the node, such
                // that we make sure to skip copying nodes that aren't intended to be copied
                const trees = this.getCopyTrees(source.metadata.clipboardNodeId, true);

                // Since we're using `ignoreSelection=true` for `getCopyTrees`, it should only
                // return one tree at most
                if (trees.length === 0) {
                  return Promise.resolve();
                } else if (trees.length > 1) {
                  throw new Error(
                    'Multiple copy trees are unexpected for drag and drop copy operation'
                  );
                }

                return this.copyContentNode({
                  ...payload,
                  id: source.metadata.id,
                  excluded_descendants: get(trees, [0, 'extra_fields', 'excluded_descendants'], {}),
                });
              })
            );
          }

          // We want to avoid launching the inherit modal when the move operation is a prepend or
          // append move, and target is the current parent. When the move operation is relative to
          // the target, that is left or right, we want only launch the modal if the parent is
          // changing
          let inherit = false;
          if (
            position === RELATIVE_TREE_POSITIONS.FIRST_CHILD ||
            position === RELATIVE_TREE_POSITIONS.LAST_CHILD
          ) {
            inherit = !sources.some(s => s.metadata.parent === targetMetadata.id);
          } else if (
            position === RELATIVE_TREE_POSITIONS.LEFT ||
            position === RELATIVE_TREE_POSITIONS.RIGHT
          ) {
            inherit = !sources.some(s => s.metadata.parent === targetMetadata.parent);
          }

          return this.moveContentNodes({
            ...payload,
            id__in: sources.map(s => s.metadata.id),
            inherit,
          });
        }
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
        // Always inherit here, as the move modal doesn't allow moving to the same parent.
        return this.moveContentNodes({ id__in: this.selected, parent: target, inherit: true }).then(
          () => {
            this.clearSelections();
            this.$refs.moveModal.moveComplete();
          }
        );
      },
      removeNodes: withChangeTracker(function(id__in, changeTracker) {
        this.trackClickEvent('Delete');
        let nextRoute;
        // If the NodePanel for one of the deleted nodes is open, close it
        if (id__in.includes(this.$route.params.detailNodeId)) {
          nextRoute = { params: { detailNodeId: null } };
        }
        return this.moveContentNodes({ id__in, parent: this.trashId, inherit: false }).then(() => {
          this.clearSelections();
          if (nextRoute) {
            this.$router.replace(nextRoute);
          }
          this.showSnackbar({
            text: this.$tr('removedItems', { count: id__in.length }),
            actionText: this.$tr('undo'),
            actionCallback: () => changeTracker.revert(),
          }).then(() => changeTracker.cleanUp());
        });
      }),
      copyToClipboard: withChangeTracker(function(ids, changeTracker) {
        this.trackClickEvent('Copy to clipboard');
        const nodes = this.getContentNodes(ids);

        return this.copyAll({ nodes }).then(() => {
          this.clearSelections();
          this.showSnackbar({
            text: this.$tr('copiedItemsToClipboard'),
            // TODO: implement revert functionality for clipboard
            // actionText: this.$tr('undo'),
            // actionCallback: () => changeTracker.revert(),
          }).then(() => changeTracker.cleanUp());
        });
      }),
      duplicateNodes: withChangeTracker(function(id__in, changeTracker) {
        this.trackClickEvent('Copy');
        this.showSnackbar({
          duration: null,
          text: this.$tr('creatingCopies'),
          // TODO: determine how to cancel copying while it's in progress,
          // TODO: if that's something we want
          // actionText: this.$tr('cancel'),
          // actionCallback: () => changeTracker.revert(),
        });
        return Promise.all(
          id__in.map(id =>
            this.copyContentNode({
              id,
              target: id,
              position: RELATIVE_TREE_POSITIONS.RIGHT,
            })
          )
        ).then(nodes => {
          this.clearSelections();
          Promise.allSettled(
            nodes.map(n =>
              this.waitForCopyingStatus({
                contentNodeId: n.id,
                startingRev: changeTracker._startingRev,
              })
            )
          ).then(results => {
            let isAllCopySuccess = true;
            for (const result of results) {
              if (result.status === 'rejected') {
                isAllCopySuccess = false;
              }
            }
            if (isAllCopySuccess) {
              this.showSnackbar({
                text: this.$tr('copiedItems'),
                actionText: this.$tr('undo'),
                actionCallback: () => changeTracker.revert(),
              }).then(() => changeTracker.cleanUp());
            } else {
              this.clearSnackbar();
              changeTracker.cleanUp();
            }
          });
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
      showTitleDescriptionModal(nodeId) {
        this.editTitleDescriptionModal = {
          nodeId,
        };
      },
      inheritMetadata(metadata) {
        const nodeIds = this.currentInheritingNodes.map(n => n.id);
        for (const nodeId of nodeIds) {
          this.updateContentNode({ id: nodeId, ...metadata, mergeMapFields: true });
        }
        this.CLEAR_INHERITING_NODES(nodeIds);
      },
    },
    $trs: {
      addTopic: 'New folder',
      sortAlphabetically: 'Sort alphabetically',
      addExercise: 'New exercise',
      uploadFiles: 'Upload files',
      importFromChannels: 'Import from channels',
      addButton: 'Add',
      editButton: 'Edit',
      editSourceButton: 'Edit source',
      editLevelsButton: 'Edit levels',
      editLanguageButton: 'Edit language',
      editAudienceButton: 'Edit audience',
      editCategoriesButton: 'Edit categories',
      editWhatIsNeededButton: 'Edit requirements',
      editLearningActivitiesButton: 'Edit learning activities',
      optionsButton: 'Options',
      copyToClipboardButton: 'Copy to clipboard',
      [viewModes.DEFAULT]: 'Default view',
      [viewModes.COMFORTABLE]: 'Comfortable view',
      [viewModes.COMPACT]: 'Compact view',
      editSelectedButton: 'Edit details',
      copySelectedButton: 'Copy to clipboard',
      moveSelectedButton: 'Move',
      duplicateSelectedButton: 'Make a copy',
      deleteSelectedButton: 'Remove',
      undo: 'Undo',
      creatingCopies: 'Copying...',
      copiedItems: 'Copy operation complete',
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

  .divider-wrapper {
    padding: 8px 12px;
    align-self: stretch;
  }
  .command-palette-wrapper {
    min-width: 0;
    flex-grow: 1;
    padding-right: 4px;
  }
  .no-shrink {
    flex-shrink: 0;
  }

</style>
