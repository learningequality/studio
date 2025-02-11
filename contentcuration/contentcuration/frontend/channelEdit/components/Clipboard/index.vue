<template>

  <VExpandXTransition>
    <DraggableRegion
      :draggableId="draggableId"
      :draggableUniverse="draggableUniverse"
      :draggableMetadata="{ id: nodeId }"
      :dropEffect="dropEffect"
      @draggableDrop="handleDraggableDrop"
    >
      <template #default="{ isDropAllowed }">
        <ResizableNavigationDrawer
          v-if="open"
          right
          :localName="localName"
          :minWidth="450"
          :maxWidth="750"
          permanent
          clipped
          class="clipboard elevation-4"
          :style="{ backgroundColor }"
          v-bind="$attrs"
          style="z-index: 5;"
        >
          <VLayout class="container ma-0 pa-0" column>
            <ToolBar
              class="header ma-0 pa-0 pl-1"
              color="white"
              clipped-right
              :flat="!elevated"
            >
              <VListTile class="grow">
                <VSlideXTransition hide-on-leave>
                  <VListTileAction v-if="!initializing && channels.length && !previewSourceNode">
                    <Checkbox
                      ref="checkbox"
                      class="ma-0 pa-0"
                      :inputValue="selected"
                      :label="selectionState ? '' : $tr('selectAll')"
                      :indeterminate="indeterminate"
                      @input="goNextSelectionState"
                    />
                  </VListTileAction>
                </VSlideXTransition>
                <VListTileContent class="grow">
                  <VSlideXReverseTransition leave-absolute>
                    <div v-if="previewSourceNode">
                      <KButton
                        appearance="basic-link"
                        class="back-to-clipboard"
                        @click.prevent="resetPreviewNode"
                      >
                        <span class="link-icon"><Icon
                          icon="back"
                          :color="$themeTokens.primary"
                        />
                        </span>
                        <span class="link-text">{{ $tr('backToClipboard') }}</span>
                      </KButton>
                    </div>
                  </VSlideXReverseTransition>
                  <VSlideXTransition leave-absolute>
                    <div v-if="selectionState && !previewSourceNode">
                      <IconButton
                        v-if="allowMove"
                        icon="move"
                        :text="$tr('moveSelectedButton')"
                        @click="calculateMoveNodes()"
                      />
                      <MoveModal
                        v-if="allowMove && moveModalOpen"
                        ref="moveModal"
                        v-model="moveModalOpen"
                        :moveNodeIds="selectedNodeIds"
                        :clipboardTopicResourceCount="topicAndResourceCount"
                        @target="moveNodes"
                      />
                      <IconButton
                        icon="copy"
                        :text="$tr('duplicateSelectedButton')"
                        :disabled="legacyNodesSelected"
                        @click="duplicateNodes()"
                      />
                      <IconButton
                        icon="remove"
                        :text="$tr('deleteSelectedButton')"
                        @click="removeNodes()"
                      />
                    </div>
                  </VSlideXTransition>
                </VListTileContent>
                <VListTileAction style="min-width: 24px">
                  <IconButton
                    class="ma-0"
                    icon="close"
                    :text="$tr('close')"
                    @click="handleClose"
                  />
                </VListTileAction>
              </VListTile>
            </ToolBar>
            <LoadingText v-if="initializing" absolute />
            <VContainer v-else-if="!channels.length" fluid class="px-5 text-xs-center">
              <h1 class="font-weight-bold mt-5 title">
                {{ $tr('emptyDefaultTitle') }}
              </h1>
              <p class="mt-3 subheading">
                {{ $tr('emptyDefaultText') }}
              </p>
            </VContainer>
            <VLayout
              v-else
              v-show="!previewSourceNode"
              ref="nodeList"
              class="elevation-0 node-list"
              @scroll="handleScroll"
            >
              <VList focusable>
                <template v-for="channel in channels">
                  <Channel :key="channel.id" :nodeId="channel.id" />
                </template>
              </VList>
            </VLayout>
            <ResourcePanel
              v-if="previewSourceNode"
              hideNavigation
              class="elevation-0 pa-3 resource-panel"
              :nodeId="previewSourceNode.id"
              @scroll="handleScroll"
            />
            <VFadeTransition>
              <div v-show="isDropAllowed" class="dragging-overlay"></div>
            </VFadeTransition>
          </VLayout>
        </ResizableNavigationDrawer>
      </template>
    </DraggableRegion>
  </VExpandXTransition>

</template>
<script>

  import { mapGetters, mapActions, mapState } from 'vuex';
  import ResourcePanel from '../ResourcePanel';
  import MoveModal from '../move/MoveModal';
  import { SelectionFlags } from '../../vuex/clipboard/constants';
  import { DraggableRegions, DraggableUniverses } from '../../constants';
  import clipboardMixin from './mixins';
  import Channel from './Channel';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';
  import Checkbox from 'shared/views/form/Checkbox';
  import IconButton from 'shared/views/IconButton';
  import ToolBar from 'shared/views/ToolBar';
  import LoadingText from 'shared/views/LoadingText';
  import { promiseChunk } from 'shared/utils/helpers';
  import { withChangeTracker } from 'shared/data/changes';
  import DraggableRegion from 'shared/views/draggable/DraggableRegion';
  import { DraggableIdentityHelper } from 'shared/vuex/draggablePlugin/module/utils';
  import { DropEffect } from 'shared/mixins/draggable/constants';

  export default {
    name: 'Clipboard',
    components: {
      ResizableNavigationDrawer,
      ResourcePanel,
      Channel,
      Checkbox,
      IconButton,
      ToolBar,
      LoadingText,
      MoveModal,
      DraggableRegion,
    },
    mixins: [clipboardMixin],
    props: {
      // key for sessionStorage to store width data at
      localName: {
        type: String,
        default: 'clipboard',
      },
      open: {
        type: Boolean,
        default: false,
      },
      // For the underlying mixin
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      nodeId: {
        type: String,
        default() {
          return this.clipboardRootId;
        },
      },
    },
    data() {
      return {
        elevated: false,
        moveModalOpen: false,
        newTrees: [],
        legacyTrees: [],
      };
    },
    computed: {
      ...mapGetters(['clipboardRootId']),
      ...mapState('clipboard', ['initializing', 'clipboardNodesMap']),
      ...mapState('contentNode', ['contentNodesMap']),
      ...mapGetters('clipboard', [
        'channels',
        'selectedNodeIds',
        'getCopyTrees',
        'getMoveTrees',
        'legacyNodesSelected',
        'previewSourceNode',
      ]),
      ...mapGetters('contentNode', {
        getRealContentNodes: 'getContentNodes',
      }),
      ...mapState('draggable/regions', ['activeDraggableId']),
      selected() {
        return Boolean(this.selectionState & SelectionFlags.ALL_DESCENDANTS);
      },
      // Overrides mixin, since entire clipboard tree cannot be selected
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      nextSelectionState() {
        const current = this.selectionState;

        return current === SelectionFlags.NONE || current & SelectionFlags.INDETERMINATE
          ? SelectionFlags.SELECTED | SelectionFlags.ALL_DESCENDANTS
          : SelectionFlags.NONE;
      },
      backgroundColor() {
        // When we have a preview, we want to make sure to have light background,
        // and when we have an even number of channels, we'll alternate so that
        // there's always contrast between last channel item and the background
        return this.previewSourceNode || this.channels.length % 2 === 0
          ? this.$vuetify.theme.backgroundColor.lighten1
          : this.$vuetify.theme.backgroundColor;
      },
      draggableUniverse() {
        return DraggableUniverses.CONTENT_NODES;
      },
      draggableId() {
        return DraggableRegions.CLIPBOARD;
      },
      dropEffect() {
        return this.activeDraggableId !== DraggableRegions.CLIPBOARD
          ? DropEffect.COPY
          : DropEffect.NONE;
      },
      topicAndResourceCount() {
        let topicCount = 0;
        let resourceCount = 0;
        const contentNodesValues = Object.values(this.contentNodesMap);
        this.selectedNodeIds.forEach(id => {
          const node = this.clipboardNodesMap[id];
          let kind = node.kind;
          // Check contentNodesMap for node kind if missing in clipboardNodesMap
          if (!kind && node.source_node_id) {
            const contentNode = contentNodesValues.find(n => n.node_id === node.source_node_id);
            kind = contentNode.kind;
          }

          if (kind === 'topic') {
            topicCount++;
          } else if (kind) {
            resourceCount++;
          } else {
            console.error('`kind` missing from content.');
          }
        });
        return { topicCount: topicCount, resourceCount: resourceCount };
      },
    },
    watch: {
      open(open) {
        if (open) {
          this.refresh();
          this.$analytics.trackClick('clipboard', 'Toggle clipboard');
        }
      },
      previewSourceNode(sourceNode) {
        // Reset elevated toolbar
        if (sourceNode) {
          this.elevated = false;
        } else {
          const target = this.$refs.nodeList.$el;
          this.$nextTick(() => {
            if (target && target.isConnected) {
              this.handleScroll({ target });
            }
          });
        }
      },
    },
    methods: {
      ...mapActions(['showSnackbar']),
      ...mapActions('clipboard', [
        'initialize',
        'copy',
        'copyAll',
        'deleteClipboardNodes',
        'moveClipboardNodes',
        'resetPreviewNode',
        'resetPreloadClipboardNodes',
      ]),
      refresh() {
        if (this.initializing) {
          return;
        }

        this.initialize();
      },
      handleScroll({ target }) {
        const elevated = target.scrollTop > 0;
        if (this.elevated !== elevated) {
          this.elevated = elevated;
        }
      },
      handleClose() {
        this.$emit('close');
        this.$nextTick(this.resetPreviewNode);
        this.resetPreloadClipboardNodes();
        this.elevated = false;
      },
      handleDraggableDrop(drop) {
        const sourceIds = drop.data.sources
          .filter(source => {
            const { region } = new DraggableIdentityHelper(source);
            return region && region.id !== DraggableRegions.CLIPBOARD;
          })
          .map(source => source.metadata.id);

        if (sourceIds.length) {
          this.copyToClipboard(sourceIds);
        }
      },
      copyToClipboard: withChangeTracker(function(ids, changeTracker) {
        const nodes = this.getRealContentNodes(ids);
        return this.copyAll({ nodes }).then(() => {
          this.showSnackbar({
            text: this.$tr('copiedItemsToClipboard'),
            // TODO: implement revert functionality for clipboard
            // actionText: this.$tr('undo'),
            // actionCallback: () => changeTracker.revert(),
          }).then(() => changeTracker.cleanUp());
        });
      }),
      calculateMoveNodes() {
        const trees = this.getMoveTrees(this.clipboardRootId);

        this.legacyTrees = trees.legacyTrees;

        this.newTrees = trees.newTrees;

        if (this.legacyTrees.length || this.newTrees.length) {
          this.moveModalOpen = true;
        }
        this.$analytics.trackClick('clipboard', 'Move');
      },
      moveNodes(target) {
        this.moveClipboardNodes({
          legacyTrees: this.legacyTrees,
          newTrees: this.newTrees,
          target,
        }).then(this.$refs.moveModal.moveComplete);
      },
      duplicateNodes: withChangeTracker(function(changeTracker) {
        this.$analytics.trackClick('clipboard', 'Copy');
        const trees = this.getCopyTrees(this.clipboardRootId);

        if (!trees.length) {
          return Promise.resolve([]);
        }

        return promiseChunk(trees, 1, ([tree]) => {
          // `tree` is exactly the params for copy
          return this.copy(tree);
        }).then(() => {
          this.showSnackbar({
            text: this.$tr('copiedItemsToClipboard'),
            // TODO: implement revert functionality for clipboard
            // actionText: this.$tr('undo'),
            // actionCallback: () => changeTracker.revert(),
          }).then(() => changeTracker.cleanUp());
        });
      }),
      removeNodes: withChangeTracker(function(changeTracker) {
        this.$analytics.trackClick('clipboard', 'Delete');
        const selectionIds = this.selectedNodeIds;

        if (!selectionIds.length) {
          return Promise.resolve([]);
        }

        return this.deleteClipboardNodes(selectionIds).then(() => {
          this.resetSelectionState();
          this.showSnackbar({
            text: this.$tr('removedFromClipboard'),
            // TODO: implement revert functionality for clipboard
            // actionText: this.$tr('undo'),
            // actionCallback: () => changeTracker.revert(),
          }).then(() => changeTracker.cleanUp());
        });
      }),
    },
    $trs: {
      selectAll: 'Select all',
      // undo: 'Undo',
      close: 'Close',
      duplicateSelectedButton: 'Make a copy',
      moveSelectedButton: 'Move',
      deleteSelectedButton: 'Delete',
      removedFromClipboard: 'Deleted from clipboard',
      copiedItemsToClipboard: 'Copied in clipboard',
      emptyDefaultTitle: 'No resources in your clipboard',
      emptyDefaultText:
        'Use the clipboard to copy resources and move them to other folders and channels',
      backToClipboard: 'Clipboard',
    },
  };

</script>
<style lang="scss" scoped>

  .clipboard {
    position: absolute;
  }

  .container,
  ::v-deep .drawer-contents {
    max-height: 100vh;
  }

  .node-list,
  .header {
    position: relative;
  }

  .header,
  .dragging-overlay {
    z-index: 4;
  }

  .back-to-clipboard,
  .link-icon {
    text-decoration: none !important;
  }

  .link-icon,
  .link-text {
    display: inline-block;
  }

  .link-icon {
    vertical-align: text-bottom;
  }

  ::v-deep .header .v-list__tile {
    border-left: 5px solid transparent;
  }

  .resource-panel,
  .node-list {
    max-width: 100%;
    overflow: auto;
  }

  .v-list {
    width: 100%;
    max-width: 100%;
    padding: 0 0 64px;
  }

  .channel-item:nth-child(2n) {
    background-color: #f9f9f9;
  }

  ::v-deep .v-toolbar__content {
    padding: 0;
  }

  ::v-deep .v-list__group--active::before {
    background: none !important;
  }

  ::v-deep .channel-item:last-child::after {
    background: rgba(0, 0, 0, 0.12) !important;
  }

  .dragging-overlay {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: rgba(153, 97, 137, 0.2);
    /* stylelint-disable-next-line custom-property-pattern */
    border: 5px solid var(--v-draggabledropoverlay-base);
  }

</style>
