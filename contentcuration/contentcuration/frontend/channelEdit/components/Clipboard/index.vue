<template>

  <VExpandXTransition>
    <ResizableNavigationDrawer
      v-if="open"
      right
      :localName="localName"
      :minWidth="450"
      :maxWidth="750"
      permanent
      clipped
      class="clipboard elevation-4"
      v-bind="$attrs"
      style="z-index: 5;"
    >
      <VLayout class="container pa-0 ma-0" column>
        <ToolBar
          class="header pa-0 ma-0"
          color="white"
          :flat="!elevated"
        >
          <VListTile class="grow">
            <VListTileAction v-if="!refreshing && channels.length">
              <Checkbox
                ref="checkbox"
                class="ma-0 pa-0"
                :value="selected"
                :label="selectionState ? '' : $tr('selectAll')"
                :indeterminate="indeterminate"
                @click.stop.prevent="goNextSelectionState"
              />
            </VListTileAction>
            <VListTileContent>
              <VSlideXTransition>
                <div v-if="selectionState">
                  <IconButton
                    v-if="canEdit"
                    icon="move"
                    :text="$tr('moveSelectedButton')"
                    @click="calculateMoveNodes()"
                  />
                  <MoveModal
                    v-if="canEdit && moveModalOpen"
                    ref="moveModal"
                    v-model="moveModalOpen"
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
            <VSpacer />
            <VListTileAction style="min-width: 24px">
              <IconButton
                class="ma-0"
                icon="close"
                :text="$tr('close')"
                @click="$emit('close')"
              />
            </VListTileAction>
          </VListTile>
        </ToolBar>
        <LoadingText v-if="refreshing" absolute />
        <VContainer v-else-if="!channels.length" fluid class="text-xs-center px-5">
          <h1 class="font-weight-bold title mt-5">
            {{ $tr('emptyDefaultTitle') }}
          </h1>
          <p class="subheading mt-3">
            {{ $tr('emptyDefaultText') }}
          </p>
        </VContainer>
        <VLayout
          v-else
          ref="nodeList"
          class="node-list elevation-0"
          @scroll="scroll"
        >
          <VList focusable>
            <template v-for="channel in channels">
              <Channel :key="channel.id" :nodeId="channel.id" />
            </template>
          </VList>
        </VLayout>
      </VLayout>
    </ResizableNavigationDrawer>
  </VExpandXTransition>

</template>
<script>

  import { mapGetters, mapActions } from 'vuex';
  import { SelectionFlags } from '../../vuex/clipboard/constants';
  import MoveModal from '../move/MoveModal';
  import Channel from './Channel';
  import clipboardMixin from './mixins';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';
  import Checkbox from 'shared/views/form/Checkbox';
  import IconButton from 'shared/views/IconButton';
  import ToolBar from 'shared/views/ToolBar';
  import LoadingText from 'shared/views/LoadingText';
  import { promiseChunk } from 'shared/utils/helpers';
  import { withChangeTracker } from 'shared/data/changes';

  export default {
    name: 'Clipboard',
    components: {
      ResizableNavigationDrawer,
      Channel,
      Checkbox,
      IconButton,
      ToolBar,
      LoadingText,
      MoveModal,
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
        refreshing: false,
        elevated: false,
        moveModalOpen: false,
        newTrees: [],
        legacyTrees: [],
      };
    },
    computed: {
      ...mapGetters(['clipboardRootId']),
      ...mapGetters('clipboard', [
        'channels',
        'selectedNodeIds',
        'selectedChannels',
        'getCopyTrees',
        'getMoveTrees',
        'legacyNodesSelected',
      ]),
      canEdit() {
        return !this.selectedChannels.find(channel => !channel.edit);
      },
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
    },
    watch: {
      open(open) {
        if (open) {
          this.refresh();
        }
      },
      channels() {
        this.loadChannelColors();
      },
    },
    methods: {
      ...mapActions(['showSnackbar']),
      ...mapActions('clipboard', [
        'loadChannels',
        'loadChannelColors',
        'copy',
        'deleteClipboardNodes',
        'moveClipboardNodes',
      ]),
      refresh() {
        if (this.refreshing) {
          return;
        }

        this.refreshing = true;
        this.loadChannels().then(() => (this.refreshing = false));
      },
      scroll() {
        this.elevated = this.$refs.nodeList.scrollTop > 0;
      },
      calculateMoveNodes() {
        const trees = this.getMoveTrees(this.clipboardRootId);

        this.legacyTrees = trees.legacyTrees;

        this.newTrees = trees.newTrees;

        if (this.legacyTrees.length || this.newTrees.length) {
          this.moveModalOpen = true;
        }
      },
      moveNodes(target) {
        this.moveClipboardNodes({
          legacyTrees: this.legacyTrees,
          newTrees: this.newTrees,
          target,
        }).then(this.$refs.moveModal.moveComplete);
      },
      duplicateNodes: withChangeTracker(function(changeTracker) {
        const trees = this.getCopyTrees(this.clipboardRootId);

        if (!trees.length) {
          return Promise.resolve([]);
        }

        this.showSnackbar({
          duration: null,
          text: this.$tr('creatingClipboardCopies'),
          actionText: this.$tr('cancel'),
          actionCallback: () => changeTracker.revert(),
        });

        return promiseChunk(trees, 1, ([tree]) => {
          // `tree` is exactly the params for copy
          return this.copy(tree);
        }).then(() => {
          return this.showSnackbar({
            text: this.$tr('copiedItemsToClipboard'),
            actionText: this.$tr('undo'),
            actionCallback: () => changeTracker.revert(),
          });
        });
      }),
      removeNodes: withChangeTracker(function(changeTracker) {
        const selectionIds = this.selectedNodeIds;

        if (!selectionIds.length) {
          return Promise.resolve([]);
        }

        this.showSnackbar({
          duration: null,
          text: this.$tr('removingItems'),
          actionText: this.$tr('cancel'),
          actionCallback: () => changeTracker.revert(),
        });

        return this.deleteClipboardNodes(selectionIds).then(() => {
          this.resetSelectionState();
          return this.showSnackbar({
            text: this.$tr('removedFromClipboard'),
            actionText: this.$tr('undo'),
            actionCallback: () => changeTracker.revert(),
          });
        });
      }),
    },
    $trs: {
      selectAll: 'Select all',
      undo: 'Undo',
      cancel: 'Cancel',
      close: 'Close',
      duplicateSelectedButton: 'Make a copy',
      moveSelectedButton: 'Move',
      deleteSelectedButton: 'Delete',
      removingItems: 'Deleting from clipboard...',
      removedFromClipboard: 'Deleted from clipboard',
      creatingClipboardCopies: 'Copying in clipboard...',
      copiedItemsToClipboard: 'Copied in clipboard',
      emptyDefaultTitle: 'No resources in your clipboard',
      emptyDefaultText:
        'Use the clipboard to copy resources and move them to other topics and channels',
      // String for returning to clipboard view from preview clipboard item view
      // eslint-disable-next-line kolibri/vue-no-unused-translations
      backToClipboard: 'Clipboard',
    },
  };

</script>
<style lang="less" scoped>

  .clipboard {
    position: absolute;
    background: rgb(250, 250, 250) !important;
  }

  .container,
  /deep/ .drawer-contents {
    max-height: 100vh;
  }

  .node-list,
  .header {
    position: relative;
  }

  .header {
    z-index: 4;
  }

  /deep/ .header .v-list__tile {
    border-left: 5px solid transparent;
  }

  .node-list {
    max-width: 100%;
    overflow: auto;
  }

  .v-list {
    width: 100%;
    max-width: 100%;
    padding: 0 0 64px;
  }

  .channel-item:nth-child(n + 2) {
    background-color: #f9f9f9;
  }

  /deep/ .v-toolbar__content {
    padding: 0;
  }

  /deep/ .v-list__group--active::before {
    background: none !important;
  }

  /deep/ .channel-item:last-child::after {
    background: rgba(0, 0, 0, 0.12) !important;
  }

</style>
