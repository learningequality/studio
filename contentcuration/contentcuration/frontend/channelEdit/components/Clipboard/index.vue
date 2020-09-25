<template>

  <VExpandXTransition>
    <ResizableNavigationDrawer
      v-if="open"
      right
      :localName="localName"
      :minWidth="400"
      :maxWidth="700"
      permanent
      clipped
      class="clipboard elevation-4"
      v-bind="$attrs"
    >
      <VLayout class="container pa-0 ma-0" column>
        <ToolBar
          class="header pa-0 ma-0"
          color="white"
          :flat="!elevated"
        >
          <VListTile class="grow">
            <VListTileAction v-if="!refreshing && channelIds.length">
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
                    @click="moveNodes()"
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
        <VContainer v-else-if="!channelIds.length" fluid class="text-xs-center px-5">
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
            <template v-for="channelId in channelIds">
              <Channel :key="channelId" :nodeId="channelId" />
            </template>
          </VList>
        </VLayout>
      </VLayout>
    </ResizableNavigationDrawer>
  </VExpandXTransition>

</template>
<script>

  import { mapGetters, mapActions, mapMutations } from 'vuex';
  import partition from 'lodash/partition';
  import { SelectionFlags } from '../../vuex/clipboard/constants';
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
      };
    },
    computed: {
      ...mapGetters(['clipboardRootId']),
      ...mapGetters('clipboard', [
        'channelIds',
        'selectedNodeIds',
        'selectedChannels',
        'getCopyTrees',
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
    },
    methods: {
      ...mapActions(['showSnackbar']),
      ...mapMutations('clipboard', { setCopyNodes: 'SET_CLIPBOARD_MOVE_NODES' }),
      ...mapMutations('contentNode', { setMoveNodes: 'SET_MOVE_NODES' }),
      ...mapActions('clipboard', ['loadChannels', 'copy', 'deleteClipboardNodes']),
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
      moveNodes() {
        const trees = this.getCopyTrees(this.clipboardRootId);
        if (!trees.length) {
          return;
        }

        const [legacyTrees, newTrees] = partition(trees, t => t.legacy);

        this.setCopyNodes(newTrees);
        this.setMoveNodes(legacyTrees);
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
